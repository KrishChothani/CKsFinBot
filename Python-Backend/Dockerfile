# FROM public.ecr.aws/lambda/python:3.11 AS builder
# RUN yum update -y && \
#     yum install -y gcc make && \
#     yum clean all

# COPY requirements.txt .

# RUN pip install --no-cache-dir -r requirements.txt -t /opt/python/ --prefer-binary

# FROM public.ecr.aws/lambda/python:3.11

# COPY --from=builder /opt/python/ ${LAMBDA_TASK_ROOT}/

# COPY app/ ${LAMBDA_TASK_ROOT}/app/
# COPY handler.py ${LAMBDA_TASK_ROOT}/

# CMD [ "handler.handler" ]
# # CMD ["uvicorn", "handler.app", "--host", "0.0.0.0", "--port", "8080"]

# ============================================================

# FROM public.ecr.aws/lambda/python:3.11 AS builder

# # 1. Install required build tools and a modern C++ compiler (devtoolset-11)
# #    Also install development libraries needed by PyMuPDF for OCR/image features.
# RUN yum update -y && \
#     yum install -y centos-release-scl && \
#     yum install -y devtoolset-11-gcc-c++ make tesseract-devel leptonica-devel && \
#     yum clean all

# # 2. Copy requirements
# COPY requirements.txt .

# # 3. Install Python packages using the modern compiler
# #    We wrap the pip install command with `scl enable` to activate the new toolchain.
# RUN scl enable devtoolset-11 -- pip install --no-cache-dir -r requirements.txt -t /opt/python/ --prefer-binary

# # --- The rest of your Dockerfile remains the same ---
# FROM public.ecr.aws/lambda/python:3.11

# COPY --from=builder /opt/python/ ${LAMBDA_TASK_ROOT}/

# COPY app/ ${LAMBDA_TASK_ROOT}/app/
# COPY handler.py ${LAMBDA_TASK_ROOT}/

# CMD [ "handler.handler" ]











# ==========================================
# FROM public.ecr.aws/lambda/python:3.11 AS builder

# # Install build tools and dependencies
# RUN yum update -y && \
#     yum install -y centos-release-scl && \
#     yum install -y devtoolset-11-gcc-c++ devtoolset-11-gcc make tesseract-devel leptonica-devel && \
#     yum clean all

# # Create a shell wrapper script to activate devtoolset and install dependencies
# RUN echo '#!/bin/bash' > /tmp/install.sh && \
#     echo 'source /opt/rh/devtoolset-11/enable' >> /tmp/install.sh && \
#     echo 'pip install --no-cache-dir -r requirements.txt -t /opt/python/ --prefer-binary' >> /tmp/install.sh && \
#     chmod +x /tmp/install.sh && \
#     /tmp/install.sh

# # ==========================================
# FROM public.ecr.aws/lambda/python:3.11

# COPY --from=builder /opt/python/ ${LAMBDA_TASK_ROOT}/

# COPY app/ ${LAMBDA_TASK_ROOT}/app/
# COPY handler.py ${LAMBDA_TASK_ROOT}/

# CMD [ "handler.handler" ]


# ===================================


# FROM public.ecr.aws/lambda/python:3.11

# # Copy requirements file
# COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# # Install Python dependencies
# RUN pip install --no-cache-dir \
#     --default-timeout=1000 \
#     --retries 5 \
#     -r ${LAMBDA_TASK_ROOT}/requirements.txt

# # Copy application code
# COPY app/ ${LAMBDA_TASK_ROOT}/app/
# COPY handler.py ${LAMBDA_TASK_ROOT}/

# # Set the CMD to your handler
# CMD ["handler.handler"]

# =========================

# ✅ Use AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Copy your code
COPY . ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Command to run your handler (replace with your actual handler)
CMD ["handler.handler"]
