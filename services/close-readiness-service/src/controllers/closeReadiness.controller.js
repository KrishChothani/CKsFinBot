/** @format */

import {
  calculate5PillarScore,
  generateChasingTemplates,
  STANDARD_RECURRING_CATEGORIES,
} from "../services/closeReadiness.service.js";
import {
  computeSummaryDigitalHash,
  formulateCompletenessBanner,
  aggregateFinancialMetrics,
} from "../services/clientSummary.service.js";
import { closeRelay } from "../services/closeRelay.service.js";

export async function getScore(req, res, next) {
  try {
    const unreviewedDocsCount = Number(req.query.unreviewedDocsCount ?? req.body.unreviewedDocsCount ?? 0);
    const unreconciledBankTxCount = Number(req.query.unreconciledBankTxCount ?? req.body.unreconciledBankTxCount ?? 0);
    const atRiskItcCount = Number(req.query.atRiskItcCount ?? req.body.atRiskItcCount ?? 0);
    const missingRecurringCount = Number(req.query.missingRecurringCount ?? req.body.missingRecurringCount ?? 0);
    const pendingVouchersCount = Number(req.query.pendingVouchersCount ?? req.body.pendingVouchersCount ?? 0);

    const scoreReport = calculate5PillarScore({
      unreviewedDocsCount,
      unreconciledBankTxCount,
      atRiskItcCount,
      missingRecurringCount,
      pendingVouchersCount,
    });

    const completeness = formulateCompletenessBanner(scoreReport);

    res.status(200).json({
      success: true,
      data: {
        ...scoreReport,
        completeness,
        standardCategories: STANDARD_RECURRING_CATEGORIES,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getChasingCopy(req, res, next) {
  try {
    const { clientName = "Valued Client", missingItems = [], portalUrl } = req.query.clientName
      ? req.query
      : req.body;

    const items = Array.isArray(missingItems) ? missingItems : [missingItems].filter(Boolean);

    const templates = generateChasingTemplates({
      clientName,
      missingItems: items.length > 0 ? items : ["Office Space Rent Invoice", "Electricity Bill"],
      portalUrl,
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
}

export async function getClientSummary(req, res, next) {
  try {
    const metrics = req.body.metrics || {
      totalRevenuePaise: Number(req.query.totalRevenuePaise) || 0,
      totalDirectExpensesPaise: Number(req.query.totalDirectExpensesPaise) || 0,
      totalOperatingExpensesPaise: Number(req.query.totalOperatingExpensesPaise) || 0,
      grossProfitPaise: Number(req.query.grossProfitPaise) || 0,
      netOperatingPositionPaise: Number(req.query.netOperatingPositionPaise) || 0,
      outputGstPaise: Number(req.query.outputGstPaise) || 0,
      eligibleItcPaise: Number(req.query.eligibleItcPaise) || 0,
      ineligibleItcPaise: Number(req.query.ineligibleItcPaise) || 0,
      itcAtRiskPaise: Number(req.query.itcAtRiskPaise) || 0,
      netGstPayablePaise: Number(req.query.netGstPayablePaise) || 0,
      closingBankBalancePaise: Number(req.query.closingBankBalancePaise) || 0,
      unreconciledBankAmountPaise: Number(req.query.unreconciledBankAmountPaise) || 0,
    };

    const periodIdentifier = req.query.periodIdentifier || req.body.periodIdentifier || "2026-10";
    const clientGstin = req.query.clientGstin || req.body.clientGstin || "27AABCU9603R1ZX";

    const digitalHash = computeSummaryDigitalHash(metrics, periodIdentifier, clientGstin);

    const closeReport = calculate5PillarScore({
      unreviewedDocsCount: Number(req.query.unreviewedDocsCount || req.body.unreviewedDocsCount || 0),
      unreconciledBankTxCount: Number(req.query.unreconciledBankTxCount || req.body.unreconciledBankTxCount || 0),
      atRiskItcCount: Number(req.query.atRiskItcCount || req.body.atRiskItcCount || 0),
      missingRecurringCount: Number(req.query.missingRecurringCount || req.body.missingRecurringCount || 0),
      pendingVouchersCount: Number(req.query.pendingVouchersCount || req.body.pendingVouchersCount || 0),
    });

    const completenessBanner = formulateCompletenessBanner(closeReport);

    res.status(200).json({
      success: true,
      data: {
        clientGstin,
        periodIdentifier,
        metrics,
        digitalHash,
        completenessBanner,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function dispatchReminder(req, res, next) {
  try {
    const {
      firmId = req.headers["x-firm-id"] || "firm-default",
      clientId = req.headers["x-client-id"] || "client-default",
      channel = "WHATSAPP",
      recipient,
      missingItems = [],
      portalUrl,
    } = req.body;

    const templates = generateChasingTemplates({
      clientName: req.body.clientName || "Client",
      missingItems,
      portalUrl,
    });

    const envelope = await closeRelay.publishClientReminderDispatched({
      firmId,
      clientId,
      channel,
      recipient: recipient || "+919876543210",
      template: channel === "EMAIL" ? templates.emailBody : templates.whatsappMessage,
    });

    res.status(200).json({
      success: true,
      message: `Reminder dispatched via ${channel}`,
      data: {
        eventId: envelope.eventId,
        channel,
        templates,
      },
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getScore,
  getChasingCopy,
  getClientSummary,
  dispatchReminder,
};

