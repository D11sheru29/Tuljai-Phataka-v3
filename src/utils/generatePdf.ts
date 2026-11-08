import { jsPDF } from 'jspdf';
import { Bill } from '../types';

export function generateInvoicePdf(bill: Bill): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // Top festive decorative bar
  doc.setFillColor(234, 88, 12); // #ea580c orange-600
  doc.rect(margin, y, contentWidth, 2.5, 'F');
  y += 7;

  // Header Zone
  // Left: Brand Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('TULJAI PHATAKA', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Authorized Crackers & Fireworks Wholesale & Retail', margin, y + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Phone: +91 9067766862, +91 9270047802, +91 7219440949, +91 9172184846', margin, y + 8.5);

  // Right: Invoice Meta Box
  const metaRight = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12); // orange-600
  doc.text('TAX INVOICE / CASH BILL', metaRight, y - 1, { align: 'right' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(bill.billNo, metaRight, y + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${bill.date}  ·  ${bill.time}`, metaRight, y + 8.5, { align: 'right' });

  y += 14;

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  // Customer & Bill Details Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'S');

  // Customer column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CUSTOMER NAME:', margin + 4, y + 5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const customerName = bill.customerName && bill.customerName.trim() ? bill.customerName : 'Walk-in Customer';
  doc.text(customerName, margin + 35, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PHONE NUMBER:', margin + 4, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const customerPhone = bill.customerPhone && bill.customerPhone.trim() ? bill.customerPhone : 'Not Provided';
  doc.text(customerPhone, margin + 35, y + 10.5);

  // Cashier column
  const midX = margin + contentWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED BY:', midX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(bill.billedBy || 'Shop Admin', midX + 22, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT MODE:', midX, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text('Cash / Spot Settlement', midX + 28, y + 10.5);

  y += 18;

  // Table Column Definitions
  // Total: 10 + 78 + 32 + 16 + 23 + 23 = 182mm
  const cols = [
    { title: '#', x: margin, w: 10, align: 'center' as const },
    { title: 'Item Description', x: margin + 10, w: 78, align: 'left' as const },
    { title: 'Category', x: margin + 88, w: 32, align: 'left' as const },
    { title: 'Qty', x: margin + 120, w: 16, align: 'center' as const },
    { title: 'Unit Price', x: margin + 136, w: 23, align: 'right' as const },
    { title: 'Total (Rs.)', x: margin + 159, w: 23, align: 'right' as const },
  ];

  // Table Header Row
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  cols.forEach((col) => {
    const textX =
      col.align === 'center'
        ? col.x + col.w / 2
        : col.align === 'right'
        ? col.x + col.w - 2
        : col.x + 2;
    doc.text(col.title, textX, y + 5, { align: col.align });
  });

  y += 7.5;

  // Table Data Rows
  bill.items.forEach((item, index) => {
    // Check if new page is needed
    if (y > pageHeight - 45) {
      doc.addPage();
      y = margin;
      // Re-render header on next page
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      cols.forEach((col) => {
        const textX =
          col.align === 'center'
            ? col.x + col.w / 2
            : col.align === 'right'
            ? col.x + col.w - 2
            : col.x + 2;
        doc.text(col.title, textX, y + 5, { align: col.align });
      });
      y += 7.5;
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252); // slate-50
    }
    doc.rect(margin, y, contentWidth, 6.5, 'F');

    // Row bottom border
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    // 1. Index
    doc.text(String(index + 1), cols[0].x + cols[0].w / 2, y + 4.5, { align: 'center' });

    // 2. Item name (truncated if too long)
    doc.setFont('helvetica', 'bold');
    const itemName = item.name.length > 44 ? item.name.substring(0, 42) + '...' : item.name;
    doc.text(itemName, cols[1].x + 2, y + 4.5);

    // 3. Category
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.category || 'Crackers', cols[2].x + 2, y + 4.5);

    // 4. Quantity
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.qty), cols[3].x + cols[3].w / 2, y + 4.5, { align: 'center' });

    // 5. Unit Price
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, cols[4].x + cols[4].w - 2, y + 4.5, { align: 'right' });

    // 6. Line Total
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${item.lineTotal.toFixed(2)}`, cols[5].x + cols[5].w - 2, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  y += 4;

  // Financial Summary Section (Right Aligned Box)
  const summaryWidth = 85;
  const summaryX = margin + contentWidth - summaryWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, y, summaryWidth, 32, 2, 2, 'FD');

  let sumY = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryX + 4, sumY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${bill.subtotal.toFixed(2)}`, summaryX + summaryWidth - 4, sumY, { align: 'right' });

  sumY += 5.5;
  if (bill.discountPercent > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`Discount (${bill.discountPercent}%):`, summaryX + 4, sumY);
    doc.setFont('helvetica', 'bold');
    doc.text(`-Rs. ${bill.discountAmount.toFixed(2)}`, summaryX + summaryWidth - 4, sumY, { align: 'right' });
    sumY += 5.5;
  }

  if (bill.taxPercent > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`GST / Tax (${bill.taxPercent}%):`, summaryX + 4, sumY);
    doc.setFont('helvetica', 'bold');
    doc.text(`+Rs. ${bill.taxAmount.toFixed(2)}`, summaryX + summaryWidth - 4, sumY, { align: 'right' });
    sumY += 5.5;
  }

  // Divider inside summary
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, sumY - 1, summaryX + summaryWidth - 3, sumY - 1);
  sumY += 3.5;

  // Grand Total Highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(234, 88, 12); // orange
  doc.text('GRAND TOTAL:', summaryX + 4, sumY);
  doc.setFontSize(11);
  doc.text(`Rs. ${bill.grandTotal.toFixed(2)}`, summaryX + summaryWidth - 4, sumY, { align: 'right' });

  // Left Note box
  const noteWidth = contentWidth - summaryWidth - 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('ITEMS SUMMARY:', margin, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const totalQty = bill.items.reduce((acc, it) => acc + it.qty, 0);
  doc.text(`Total Items Quantity: ${totalQty} units`, margin, y + 10);
  doc.text(`Total Unique Items: ${bill.items.length} lines`, margin, y + 15);
  doc.text('Official receipt for fireworks purchase.', margin, y + 20);

  y += 38;

  // Footer Message
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(234, 88, 12);
  doc.text('Wishing You and Your Family a Safe & Joyous Celebration!', pageWidth / 2, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Please sell and use crackers according to local laws and safety rules.', pageWidth / 2, y + 4.5, { align: 'center' });
  doc.text('Thank you for shopping at TULJAI PHATAKA!', pageWidth / 2, y + 8.5, { align: 'center' });

  // Save / Trigger Download
  const filename = `TULJAI_PHATAKA_Bill_${bill.billNo}.pdf`;
  doc.save(filename);
}
