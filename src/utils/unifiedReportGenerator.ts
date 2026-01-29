import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings } from '@/types/asset';
import { logger } from '@/lib/logger';
import { Capacitor } from '@capacitor/core';
import { handleMobilePdfAction } from '@/utils/mobilePdfUtils';

// Remove module declaration as we are using functional approach

interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface SummaryStatistic {
  label: string;
  value: string | number;
}

interface ReportConfig {
  title: string;
  subtitle?: string;
  reportType?: string;
  companySettings: CompanySettings;
  columns: TableColumn[];
  data: any[];
  summaryStats?: SummaryStatistic[];
  orientation?: 'portrait' | 'landscape';
  headerColor?: [number, number, number];
}

/**
 * Unified Professional PDF Report Generator
 * Applies consistent professional formatting across all reports
 */
/**
 * Helper to load an image and get its dimensions
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Convert relative paths to absolute URLs
    if (src.startsWith('/') && !src.startsWith('//')) {
      img.src = window.location.origin + src;
    } else {
      img.src = src;
    }
  });
};

/**
 * Unified Professional PDF Report Generator
 * Applies consistent professional formatting across all reports
 */
export const generateUnifiedReport = async (config: ReportConfig): Promise<void> => {
  const {
    title,
    subtitle,
    reportType,
    companySettings,
    columns,
    data,
    summaryStats,
    orientation = 'portrait',
    headerColor = [41, 128, 185] // Professional blue
  } = config;

  // Create new PDF document with specified orientation
  const doc = new jsPDF(orientation);

  // Add company logo if available
  if (companySettings.logo) {
    try {
      const img = await loadImage(companySettings.logo);

      // Calculate aspect ratio to fit within 30x20 box
      const maxW = 30;
      const maxH = 20;
      const aspect = img.width / img.height;

      let finalW = maxW;
      let finalH = maxW / aspect;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = maxH * aspect;
      }

      // Determine format from data URI if possible, otherwise let jsPDF auto-detect
      let format: string | undefined = undefined;
      if (companySettings.logo.startsWith('data:image/png')) format = 'PNG';
      else if (companySettings.logo.startsWith('data:image/jpeg')) format = 'JPEG';
      else if (companySettings.logo.startsWith('data:image/jpg')) format = 'JPEG';
      // If it's a URL or other format, leaving it undefined often works best for auto-detection
      // or we can default to 'JPEG' if undefined, but 'PNG' is safer for transparency.

      doc.addImage(companySettings.logo, format as any, 20, 10, finalW, finalH);
    } catch (error) {
      logger.warn('Could not add logo to PDF', { context: 'UnifiedReportGenerator', data: { error } });
    }
  }

  /* 
    Brand Standard: 
    - Font: Helvetica (Standard Professional)
    - Header: Bold, 22pt (Company Name)
    - Metadata: Normal, 10pt/9pt
    - Separator Line: Light Grey
  */

  // Add company information
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');

  const companyName = companySettings.companyName || 'Asset Management System';
  const companyNameWidth = doc.getTextWidth(companyName);
  // If logo exists, align to right of logo (60), else left align (20)
  const nameX = companySettings.logo ? 60 : 20;

  doc.text(companyName, nameX, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50); // Dark grey for contact info

  let headerY = 22;
  const lineHeight = 5;

  if (companySettings.address) {
    doc.text(companySettings.address, nameX, headerY);
    headerY += lineHeight;
  }
  if (companySettings.phone) {
    doc.text(`Phone: ${companySettings.phone}`, nameX, headerY);
    headerY += lineHeight;
  }
  if (companySettings.email) {
    doc.text(`Email: ${companySettings.email}`, nameX, headerY);
  }

  // Draw a professional separator line
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, 42, pageWidth - 20, 42);

  // Add report title and metadata - Compact Layout
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Black for title
  doc.text(title, 20, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  // Combine Generated on and Report Type
  const dateStr = `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  doc.text(dateStr, 20, 58);

  if (reportType) {
    doc.text(`Report Type: ${reportType.toUpperCase()}`, 20, 63);
  }

  // Subtitle (if any)
  let tableStartY = 75;
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(0, 0, 0);
    doc.text(subtitle, 20, 70);
  } else {
    tableStartY = 68;
  }

  doc.setTextColor(0, 0, 0); // Ensure black for table content

  // Prepare table configuration
  const tableColumns = columns.map(col => col.header);
  const tableData = data.map(row =>
    columns.map(col => {
      const value = row[col.dataKey];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return value.toLocaleDateString();
      return String(value);
    })
  );

  // Calculate column styles
  const columnStyles: any = {};
  columns.forEach((col, index) => {
    if (col.width) {
      columnStyles[index] = { cellWidth: col.width };
    }
  });

  // Add table with professional styling
  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumns],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: headerColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle'
    },
    columnStyles: columnStyles,
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  });

  // Add summary statistics if provided
  if (summaryStats && summaryStats.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Add a small separator for summary
    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY + 10, 60, finalY + 10);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics:', 20, finalY + 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    let summaryY = finalY + 25;
    let summaryX = 20;
    const columnWidth = 80; // reduced column width for compactness

    summaryStats.forEach((stat, index) => {
      // Create columns of statistics (wider breakdown)
      if (index > 0 && index % 6 === 0) {
        summaryY = finalY + 25;
        summaryX += columnWidth;
      }

      const statText = `${stat.label}: ${stat.value}`;
      doc.text(statText, summaryX, summaryY);
      summaryY += 5; // Compact spacing (5)
    });
  }

  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    const footerText = `Page ${i} of ${pageCount} | Generated by ${companySettings.companyName || 'Asset Management System'}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(footerText);

    doc.text(
      footerText,
      (pageWidth - textWidth) / 2,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF with timestamped filename
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedTitle = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const fileName = `${sanitizedTitle}-${timestamp}.pdf`;

  if (Capacitor.isNativePlatform()) {
    await handleMobilePdfAction(doc, fileName, 'download');
  } else {
    doc.save(fileName);
  }
  logger.info(`PDF report generated: ${fileName}`);
};

/**
 * Helper function to format currency values
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value);
};

/**
 * Helper function to format percentages
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};