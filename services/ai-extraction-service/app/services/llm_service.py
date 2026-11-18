# app/services/llm_service.py
import math
import re
import json
import asyncio
from operator import itemgetter
from typing import List, Dict, Any, Tuple, Optional

from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_pinecone import PineconeVectorStore

from app.core.config import settings
from app.core.model_loader import llm_model, embedding_model
from .pinecone_service import get_pinecone_client
from app.prompts import (
    SMART_CHAT_PROMPT_TEMPLATE,
    DOCUMENT_ANALYSIS_PROMPT_TEMPLATE,
    ANALYTICAL_INSIGHTS_PROMPT_TEMPLATE,
    GENERAL_CONVERSATION_PROMPT_TEMPLATE,
    FINANCIAL_DOCUMENT_DRAFTING_PROMPT_TEMPLATE,
    FINANCIAL_DRAFTER_SUGGESTION_PROMPT_TEMPLATE,
    HYDE_FINANCIAL_PROMPT,
    LEGAL_CONTRACT_DRAFTING_PROMPT_TEMPLATE,
    LEGAL_DRAFTER_SUGGESTION_PROMPT_TEMPLATE,
)


# ─── Token Utilities ──────────────────────────────────────────────────────────

def _estimate_tokens_from_text(text: str) -> int:
    """Rough conservative estimate: 1 token ≈ 4 characters."""
    return max(0, len(text) // 4)


def _extract_token_count(response) -> int:
    """Extracts actual token count if available from Gemini / LangChain response metadata."""
    try:
        meta = getattr(response, "usage_metadata", None)
        if meta:
            if isinstance(meta, dict):
                return int(meta.get("total_token_count", 0) or 
                           (meta.get("input_tokens", 0) + meta.get("output_tokens", 0)))
            total = getattr(meta, "total_token_count", 0)
            return int(total) if total else 0
    except Exception:
        pass
    return 0


# ─── Citation & Context Formatting ───────────────────────────────────────────

def format_docs(docs: list) -> str:
    """Format retrieved documents into a plain string without citation markers."""
    if not docs:
        return "No relevant documents found."
    return "\n---\n".join([doc.page_content for doc in docs])


def format_docs_with_citations(docs: list) -> Tuple[str, dict]:
    """
    Labels each chunk [Source S1], [Source S2], ... so the LLM can cite accurately.
    Returns:
        (formatted_context: str, source_map: dict)
    """
    if not docs:
        return "No financial documents have been uploaded or referenced.", {}

    context_lines = []
    source_map = {}

    for i, doc in enumerate(docs, start=1):
        source_id = f"S{i}"
        meta = getattr(doc, "metadata", {}) or {}
        doc_id = meta.get("document_id") or meta.get("documentId") or ""
        file_name = meta.get("fileName") or meta.get("file_name") or meta.get("source_filename") or f"Document {i}"
        page_num = meta.get("page") or meta.get("page_number") or 1
        raw_bboxes = meta.get("bboxes", "[]")
        raw_span = meta.get("page_span", "[]")

        try:
            bboxes = json.loads(raw_bboxes) if isinstance(raw_bboxes, str) else (raw_bboxes or [])
        except Exception:
            bboxes = []

        try:
            page_span = json.loads(raw_span) if isinstance(raw_span, str) else (raw_span or [page_num])
        except Exception:
            page_span = [page_num]

        source_map[source_id] = {
            "documentId": str(doc_id) if doc_id else None,
            "fileName": file_name,
            "pageNumber": page_num,
            "pageSpan": page_span,
            "bboxes": bboxes,
            "chunkText": doc.page_content,
        }

        context_lines.append(
            f"[Source {source_id}]\n"
            f"Document: {file_name} (Page {page_num})\n"
            f"Content: {doc.page_content}\n"
        )

    return "\n---\n".join(context_lines), source_map


def parse_and_validate_citations(llm_text: str, source_map: dict) -> Tuple[str, list]:
    """
    Finds citation tags in the LLM response (supports [S1], [Source S1], [Source 1], [1]),
    replaces them with standard inline numbered citations [1], [2], and returns a structured list.
    """
    if not source_map:
        return llm_text, []

    matches = list(re.finditer(r"\[(?:Source\s+)?(?:S)?(\d+)\]", llm_text))

    citations = []
    tag_to_index = {}
    clean_text = llm_text
    seen = set()

    for m in matches:
        full_match = m.group(0)
        tag_num = m.group(1)
        src_key = f"S{tag_num}"

        if src_key not in source_map:
            continue

        if tag_num not in seen:
            seen.add(tag_num)
            new_idx = len(citations) + 1
            tag_to_index[src_key] = new_idx
            src = source_map[src_key]
            citations.append({
                "index": new_idx,
                "citationType": "document",
                "title": src["fileName"],
                "url": "",
                "documentId": src["documentId"],
                "fileName": src["fileName"],
                "pageNumber": src["pageNumber"],
                "pageSpan": src["pageSpan"],
                "snippet": src["chunkText"][:300],
                "bboxes": src["bboxes"],
                "confidenceScore": 1.0,
            })

    for m in matches:
        full_match = m.group(0)
        tag_num = m.group(1)
        src_key = f"S{tag_num}"
        if src_key in tag_to_index:
            new_idx = tag_to_index[src_key]
            clean_text = clean_text.replace(full_match, f"[{new_idx}]")

    # If no inline tags were placed by the LLM, but documents were retrieved and used, provide document citations
    if not citations and source_map:
        seen_docs = set()
        for src_key, src in source_map.items():
            doc_id = src.get("documentId")
            if doc_id and doc_id in seen_docs:
                continue
            if doc_id:
                seen_docs.add(doc_id)
            new_idx = len(citations) + 1
            citations.append({
                "index": new_idx,
                "citationType": "document",
                "title": src["fileName"],
                "url": "",
                "documentId": src["documentId"],
                "fileName": src["fileName"],
                "pageNumber": src["pageNumber"],
                "pageSpan": src["pageSpan"],
                "snippet": src["chunkText"][:300],
                "bboxes": src["bboxes"],
                "confidenceScore": 1.0,
            })

    return clean_text, citations


def format_chat_history(chat_history) -> str:
    """Formats chat history into a readable string."""
    if isinstance(chat_history, str):
        return chat_history
    if not chat_history:
        return "No previous conversation."
    return "\n".join([
        f"{msg.get('role', 'unknown').capitalize()}: {msg.get('content', '')}"
        for msg in chat_history if isinstance(msg, dict)
    ])


# ─── HyDE: Hypothetical Document Embeddings ───────────────────────────────────

async def generate_financial_hypothesis(query: str, llm) -> str:
    """
    HyDE: Generates a short hypothetical financial disclosure or filing passage for the query.
    Embeddings in "answer space" significantly improve Pinecone retrieval recall.
    """
    try:
        prompt = PromptTemplate.from_template(HYDE_FINANCIAL_PROMPT)
        chain = prompt | llm | StrOutputParser()
        hypothesis = (await chain.ainvoke({"query": query})).strip()
        if hypothesis:
            print(f"💡 HyDE financial hypothesis generated ({len(hypothesis.split())} words).")
            return hypothesis
    except Exception as e:
        print(f"⚠️  HyDE generation failed: {e}. Falling back to plain query.")
    return query


# ─── Multi-Namespace Vector Retrieval ─────────────────────────────────────────

async def retrieve_from_multiple_namespaces(embeddings, question: str, namespaces: list) -> list:
    """
    Dynamically determines search 'k' based on namespace stats and retrieves chunks concurrently.
    """
    if not namespaces:
        print("⚠️  No namespaces provided for retrieval.")
        return []

    namespace_stats = {}
    try:
        print("📊 Fetching index stats from Pinecone...")
        pinecone_client = get_pinecone_client()
        pinecone_index = pinecone_client.Index("cksfinbot")
        stats = pinecone_index.describe_index_stats()
        namespace_stats = stats.get('namespaces', {})
        print("✅ Successfully fetched Pinecone stats.")
    except Exception as e:
        print(f"❌ Error fetching Pinecone stats: {e}. Falling back to default k=10.")

    tasks = []
    for ns in namespaces:
        try:
            chunk_count = namespace_stats.get(ns, {}).get('vector_count', 0)
            if chunk_count > 0:
                k = math.ceil(chunk_count * 0.15)
                dynamic_k = max(5, min(k, 40))
                print(f"🔍 Retrieving from '{ns}' with dynamic k={dynamic_k} (out of {chunk_count} vectors)")
            else:
                dynamic_k = 10

            vectorstore = PineconeVectorStore(
                index_name="cksfinbot",
                embedding=embeddings,
                namespace=ns
            )
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": dynamic_k}
            )
            tasks.append(retriever.ainvoke(question))
        except Exception as e:
            print(f"⚠️  Warning: Could not create retriever for namespace {ns}: {e}")

    if not tasks:
        return []

    all_docs_nested = await asyncio.gather(*tasks, return_exceptions=True)
    combined_docs = []
    for result in all_docs_nested:
        if isinstance(result, Exception):
            print(f"⚠️  Retrieval error: {result}")
        else:
            combined_docs.extend(result)

    print(f"✅ Retrieved a total of {len(combined_docs)} document chunks from {len(namespaces)} namespaces.")
    return combined_docs


async def hyde_retrieve_from_namespaces(llm, embeddings, query: str, namespaces: list) -> list:
    """
    Dual HyDE retrieval: Searches with both hypothetical answer and actual query, then merges & deduplicates.
    """
    if not namespaces:
        return []

    # Step 1: Generate hypothesis
    hypothesis = await generate_financial_hypothesis(query, llm)

    # Step 2: Retrieve both in parallel
    hyde_docs, query_docs = await asyncio.gather(
        retrieve_from_multiple_namespaces(embeddings, hypothesis, namespaces),
        retrieve_from_multiple_namespaces(embeddings, query, namespaces),
    )

    # Step 3: Deduplicate chunks preserving order (hypothesis first)
    seen_hashes = set()
    merged = []
    for doc in hyde_docs + query_docs:
        content_hash = hash(doc.page_content[:200])
        if content_hash not in seen_hashes:
            seen_hashes.add(content_hash)
            merged.append(doc)

    print(f"🔬 HyDE: {len(hyde_docs)} hypothesis-docs + {len(query_docs)} query-docs → {len(merged)} unique chunks.")
    return merged


# ─── Pipelines ────────────────────────────────────────────────────────────────

async def smart_chat_pipeline(llm, embeddings, question: str, chat_history: str, namespaces: list) -> dict:
    """
    Smart Chat Pipeline: Multi-modal RAG with HyDE, structured citation parsing, and token tracking.
    """
    print("🚀 Executing Smart Chat Pipeline with HyDE & Citations")

    relevant_docs = []
    if namespaces:
        relevant_docs = await hyde_retrieve_from_namespaces(llm, embeddings, question, namespaces)

    doc_context, source_map = format_docs_with_citations(relevant_docs)

    prompt = PromptTemplate.from_template(SMART_CHAT_PROMPT_TEMPLATE)
    rag_chain = (
        {
            "context": lambda _: doc_context,
            "question": itemgetter("question"),
            "chat_history": itemgetter("chat_history"),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    print("📤 Sending Smart Chat query to Gemini...")
    raw_response = await rag_chain.ainvoke({"question": question, "chat_history": chat_history})
    print("✅ Response received from Gemini")

    clean_answer, citations = parse_and_validate_citations(raw_response, source_map)

    # Calculate tokens
    input_tokens = _estimate_tokens_from_text(doc_context + question + chat_history)
    output_tokens = _estimate_tokens_from_text(raw_response)
    tokens_used = input_tokens + output_tokens

    return {
        "answer": clean_answer,
        "citations": citations,
        "tokens_used": tokens_used
    }


async def financial_drafter_pipeline(llm, embeddings, instruction: str, chat_history: str, namespaces: list) -> dict:
    """
    Financial Document Drafter Pipeline:
    Drafts comprehensive, audit-ready financial documents, models, and reports grounded in uploaded financial context.
    """
    print("✍️  Executing Financial Document Drafter Pipeline")

    relevant_docs = []
    if namespaces:
        relevant_docs = await hyde_retrieve_from_namespaces(llm, embeddings, instruction, namespaces)

    doc_context, source_map = format_docs_with_citations(relevant_docs)

    prompt = PromptTemplate.from_template(FINANCIAL_DOCUMENT_DRAFTING_PROMPT_TEMPLATE)
    rag_chain = (
        {
            "context": lambda _: doc_context,
            "question": itemgetter("instruction"),
            "chat_history": lambda _: chat_history,
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    print("📤 Sending drafting instruction to Gemini...")
    raw_draft = await rag_chain.ainvoke({
        "instruction": instruction,
        "chat_history": chat_history
    })
    print("✅ Financial document drafted successfully")

    clean_draft, citations = parse_and_validate_citations(raw_draft, source_map)

    input_tokens = _estimate_tokens_from_text(doc_context + instruction + chat_history)
    output_tokens = _estimate_tokens_from_text(raw_draft)
    tokens_used = input_tokens + output_tokens

    return {
        "answer": clean_draft,
        "citations": citations,
        "tokens_used": tokens_used
    }


async def financial_drafter_suggestion_pipeline(selected_text: str, document_context: str, user_instruction: str = "") -> str:
    """
    Financial Drafter Suggestion Pipeline:
    Improves highlighted / selected text in the drafting studio with CFO-grade polish and accuracy.
    """
    print("✨ Executing Financial Drafter Suggestion Pipeline")
    llm = llm_model
    if not user_instruction:
        user_instruction = "Improve this financial text for clarity, professional CFO-level tone, and numerical precision."

    prompt = PromptTemplate.from_template(FINANCIAL_DRAFTER_SUGGESTION_PROMPT_TEMPLATE)
    chain = (
        {
            "selected_text": itemgetter("selected_text"),
            "document_context": itemgetter("document_context"),
            "user_instruction": itemgetter("user_instruction"),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    print("📤 Sending text selection to Gemini for improvement...")
    response = await chain.ainvoke({
        "selected_text": selected_text,
        "document_context": document_context,
        "user_instruction": user_instruction
    })
    print("✅ Financial suggestion generated successfully")
    return response.strip()


async def document_analysis_pipeline(llm, embeddings, question: str, chat_history: str, namespaces: list) -> dict:
    """Document Analysis Pipeline."""
    print("🚀 Executing Document Analysis Pipeline")
    relevant_docs = []
    if namespaces:
        relevant_docs = await retrieve_from_multiple_namespaces(embeddings, question, namespaces)

    doc_context, source_map = format_docs_with_citations(relevant_docs)
    prompt = PromptTemplate.from_template(DOCUMENT_ANALYSIS_PROMPT_TEMPLATE)
    chain = (
        {
            "context": lambda _: doc_context,
            "question": itemgetter("question"),
            "chat_history": itemgetter("chat_history"),
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    raw_answer = await chain.ainvoke({"question": question, "chat_history": chat_history})
    clean_answer, citations = parse_and_validate_citations(raw_answer, source_map)
    tokens_used = _estimate_tokens_from_text(doc_context + question + chat_history + raw_answer)

    return {
        "answer": clean_answer,
        "citations": citations,
        "tokens_used": tokens_used
    }


async def analytical_insights_pipeline(llm, embeddings, question: str, chat_history: str, namespaces: list) -> dict:
    """Analytical Insights Pipeline."""
    print("🚀 Executing Analytical Insights Pipeline")
    relevant_docs = []
    if namespaces:
        relevant_docs = await hyde_retrieve_from_namespaces(llm, embeddings, question, namespaces)

    doc_context, source_map = format_docs_with_citations(relevant_docs)
    prompt = PromptTemplate.from_template(ANALYTICAL_INSIGHTS_PROMPT_TEMPLATE)
    chain = (
        {
            "context": lambda _: doc_context,
            "question": itemgetter("question"),
            "chat_history": itemgetter("chat_history"),
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    raw_answer = await chain.ainvoke({"question": question, "chat_history": chat_history})
    clean_answer, citations = parse_and_validate_citations(raw_answer, source_map)
    tokens_used = _estimate_tokens_from_text(doc_context + question + chat_history + raw_answer)

    return {
        "answer": clean_answer,
        "citations": citations,
        "tokens_used": tokens_used
    }


async def general_conversation_pipeline(llm, question: str, chat_history: str) -> dict:
    """General Conversation Pipeline without vector retrieval."""
    print("🚀 Executing General Conversation Pipeline with LCEL")
    prompt = PromptTemplate.from_template(GENERAL_CONVERSATION_PROMPT_TEMPLATE)
    conversation_chain = prompt | llm | StrOutputParser()
    response = await conversation_chain.ainvoke({"question": question, "chat_history": chat_history})
    tokens_used = _estimate_tokens_from_text(question + chat_history + response)

    return {
        "answer": response,
        "citations": [],
        "tokens_used": tokens_used
    }


# ─── Main Router Entry Point ──────────────────────────────────────────────────

async def get_answer_from_rag(question: str, chat_history: list, pinecone_namespaces: list, feature_mode: str) -> dict:
    """
    Main entry point for RAG queries. Routes to the appropriate pipeline and returns
    a dictionary containing answer, citations, and tokens_used.
    """
    print(f"🎯 Router: Processing query with feature_mode='{feature_mode}'")
    llm = llm_model
    embeddings = embedding_model
    formatted_history = format_chat_history(chat_history)

    if feature_mode in ["Financial_Drafter", "Legal_Drafter", "Document_Drafter"]:
        return await financial_drafter_pipeline(llm, embeddings, question, formatted_history, pinecone_namespaces)

    elif feature_mode == "Document_Analysis":
        return await document_analysis_pipeline(llm, embeddings, question, formatted_history, pinecone_namespaces)

    elif feature_mode == "Analytical_Insights":
        return await analytical_insights_pipeline(llm, embeddings, question, formatted_history, pinecone_namespaces)

    elif feature_mode == "General_Conversation":
        return await general_conversation_pipeline(llm, question, formatted_history)

    else:
        # Default to Smart Chat
        return await smart_chat_pipeline(llm, embeddings, question, formatted_history, pinecone_namespaces)


# Aliases for MatterAssist compatibility
legal_drafter_pipeline = financial_drafter_pipeline
legal_drafter_suggestion_pipeline = financial_drafter_suggestion_pipeline
