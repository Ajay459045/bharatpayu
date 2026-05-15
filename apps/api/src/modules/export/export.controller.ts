import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { BbpsService } from "../bbps/bbps.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("exports")
export class ExportController {
  constructor(private readonly bbps: BbpsService) {}

  @Roles("super_admin", "admin", "distributor")
  @Get("transactions")
  async exportTransactions(@Query() query: Record<string, string>, @Res() res: Response) {
    const format = query.format ?? "csv";
    const rows = await this.bbps.findTransactions(query);
    const normalized = rows.map((txn) => ({
      transactionId: txn.transactionId,
      retailerId: String(txn.retailerId),
      distributorId: txn.distributorId ? String(txn.distributorId) : "",
      serviceCategory: txn.serviceCategory,
      operator: txn.operator,
      customerName: txn.customerName,
      amount: txn.amount,
      retailerCommission: txn.retailerCommission,
      distributorCommission: txn.distributorCommission,
      tdsAmount: txn.tdsAmount,
      status: txn.status,
      createdAt: String((txn as { createdAt?: Date }).createdAt ?? "")
    }));

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("transactions");
      sheet.columns = Object.keys(normalized[0] ?? { transactionId: "" }).map((key) => ({ header: key, key, width: 22 }));
      sheet.addRows(normalized);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=bharatpayu-transactions.xlsx");
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=bharatpayu-transactions.pdf");
      const doc = new PDFDocument({ margin: 36 });
      doc.pipe(res);
      doc.fontSize(18).text("BharatPayU Transactions");
      normalized.slice(0, 250).forEach((row) => doc.fontSize(9).text(`${row.transactionId} | ${row.serviceCategory} | ${row.operator} | ${row.amount} | ${row.status}`));
      doc.end();
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bharatpayu-transactions.csv");
    return res.send(stringify(normalized, { header: true }));
  }
}
