import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Asset, Waybill, Site, Employee, QuickCheckout, CompanySettings } from '@/types/asset';
import { EquipmentLog } from '@/types/equipment';
import { ConsumableUsageLog } from '@/types/consumable';
import { logger } from '@/lib/logger';

interface AuditData {
    startDate: Date;
    endDate: Date;
    companySettings: CompanySettings;
    assets: Asset[];
    waybills: Waybill[];
    sites: Site[];
    employees: Employee[];
    checkouts: QuickCheckout[];
    equipmentLogs: EquipmentLog[];
    consumableLogs?: ConsumableUsageLog[];
    siteInventory: Map<string, Asset[]>;
    chartImage?: string;
}

/**
 * Helper to load an image
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        if (src.startsWith('/') && !src.startsWith('//')) {
            img.src = window.location.origin + src;
        } else {
            img.src = src;
        }
    });
};

/**
 * Format currency properly - using simple formatting to avoid PDF encoding issues
 */
const formatNGN = (value: number): string => {
    if (value === 0) return 'NGN 0.00';
    const absValue = Math.abs(value);
    const formatted = absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return value < 0 ? `NGN -${formatted}` : `NGN ${formatted}`;
};

export const generateAuditReport = async (data: AuditData) => {
    const { startDate, endDate, companySettings, assets, waybills, sites, employees, checkouts, equipmentLogs, consumableLogs = [], chartImage } = data;

    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Format date range for display
    const formatDate = (d: Date) => d.toLocaleDateString('en-GB');
    const dateRangeLabel = `${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Helper to check if a date falls within the audit period
    const isInPeriod = (date: Date | string) => {
        const d = new Date(date);
        return d >= startDate && d <= endDate;
    };

    const isBeforePeriod = (date: Date | string) => {
        const d = new Date(date);
        return d < startDate;
    };

    // Determine logo source - use companySettings.logo if available, otherwise fallback to ./logo.png
    const logoSrc = companySettings.logo || './logo.png';

    // --- UTILS ---
    const addWatermark = async () => {
        try {
            doc.saveGraphicsState();
            const gState = new (doc as any).GState({ opacity: 0.08 });
            doc.setGState(gState);

            const img = await loadImage(logoSrc);
            const wmWidth = 120;
            const wmHeight = wmWidth * (img.height / img.width);
            const wmX = (pageWidth - wmWidth) / 2;
            const wmY = (pageHeight - wmHeight) / 2;

            let format: string | undefined = 'PNG';
            if (logoSrc.startsWith('data:image/jpeg')) format = 'JPEG';

            doc.addImage(logoSrc, format as any, wmX, wmY, wmWidth, wmHeight);
            doc.restoreGraphicsState();
        } catch (e) {
            logger.warn('Watermark failed', e);
        }
    };

    const addHeader = async () => {
        await addWatermark();

        try {
            const img = await loadImage(logoSrc);
            const aspect = img.width / img.height;
            const maxH = 22;
            const maxW = 35;

            let h = maxH;
            let w = h * aspect;
            if (w > maxW) {
                w = maxW;
                h = w / aspect;
            }

            let format: string | undefined = 'PNG';
            if (logoSrc.startsWith('data:image/jpeg')) format = 'JPEG';

            doc.addImage(logoSrc, format as any, 14, 10, w, h);
        } catch (e) {
            logger.warn('Header logo failed', e);
        }

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(companySettings.companyName || 'DCEL', 55, 18);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${companySettings.address || ''}`, 55, 24);
        doc.text(`Tel: ${companySettings.phone || ''}`, 55, 29);

        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 36, pageWidth - 14, 36);
    };

    const checkPageBreak = async (currentY: number, needed: number = 60) => {
        if (currentY > pageHeight - needed) {
            doc.addPage();
            await addHeader();
            return 46;
        }
        return currentY;
    };

    // ============================================
    // OPERATIONAL ANALYSIS - THE STORY
    // ============================================

    // 1. Financial Growth Analysis
    const assetsAddedInPeriod = assets.filter(a => isInPeriod(a.createdAt));
    const assetsBeforePeriod = assets.filter(a => isBeforePeriod(a.createdAt));
    const totalValue = assets.reduce((sum, a) => sum + (a.cost * a.quantity), 0);
    const valueAddedInPeriod = assetsAddedInPeriod.reduce((sum, a) => sum + (a.cost * a.quantity), 0);
    const openingValue = assetsBeforePeriod.reduce((sum, a) => sum + (a.cost * a.quantity), 0);
    const netGrowth = totalValue - openingValue;
    const growthPercentage = openingValue > 0 ? (netGrowth / openingValue) * 100 : 0;

    // 2. Site Operations Analysis
    const activeSites = sites.filter(s => s.status === 'active');
    const sitesOpenedInPeriod = sites.filter(s => isInPeriod(s.createdAt));

    // Calculate materials deployed per site from siteQuantities
    const siteMaterialsMap = new Map<string, { totalItems: number; totalValue: number; assets: { name: string; qty: number; value: number }[] }>();

    activeSites.forEach(site => {
        const siteAssets: { name: string; qty: number; value: number }[] = [];
        let totalItems = 0;
        let totalValue = 0;

        assets.forEach(asset => {
            const qtyAtSite = asset.siteQuantities?.[site.id] || 0;
            if (qtyAtSite > 0) {
                const value = qtyAtSite * asset.cost;
                siteAssets.push({ name: asset.name, qty: qtyAtSite, value });
                totalItems += qtyAtSite;
                totalValue += value;
            }
        });

        siteMaterialsMap.set(site.id, { totalItems, totalValue, assets: siteAssets.sort((a, b) => b.value - a.value) });
    });

    // 3. Equipment Utilization (ONLY equipment that requires logging)
    const loggingEquipment = assets.filter(a => a.requiresLogging === true);

    const equipmentStats = new Map<string, {
        name: string;
        totalDays: number;
        activeDays: number;
        downtimeDays: number;
        utilizationRate: number;
        totalFuel: number;
        averageFuelPerDay: number;
        downtimeReasons: string[];
    }>();

    loggingEquipment.forEach(eq => {
        const logs = equipmentLogs.filter(log =>
            log.equipmentId === eq.id &&
            isInPeriod(log.date)
        );

        const activeDays = logs.filter(l => l.active).length;
        const totalDays = logs.length;
        const downtimeDays = totalDays - activeDays;
        const utilizationRate = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;

        const totalFuel = logs.reduce((sum, l) => sum + (l.dieselEntered || 0), 0);
        const averageFuelPerDay = activeDays > 0 ? totalFuel / activeDays : 0;

        const downtimeReasons: string[] = [];
        logs.forEach(log => {
            log.downtimeEntries?.forEach(entry => {
                if (entry.downtimeReason && !downtimeReasons.includes(entry.downtimeReason)) {
                    downtimeReasons.push(entry.downtimeReason);
                }
            });
        });

        equipmentStats.set(eq.id, {
            name: eq.name,
            totalDays,
            activeDays,
            downtimeDays,
            utilizationRate,
            totalFuel,
            averageFuelPerDay,
            downtimeReasons: downtimeReasons.slice(0, 3)
        });
    });

    // 4. Consumable Usage Analysis
    const consumableUsage = new Map<string, {
        name: string;
        totalUsed: number;
        unit: string;
        usageCount: number;
        topPurposes: string[];
        monthlyUsage: number[];
    }>();

    consumableLogs
        .filter(log => isInPeriod(log.date))
        .forEach(log => {
            const existing = consumableUsage.get(log.consumableId) || {
                name: log.consumableName,
                totalUsed: 0,
                unit: log.unit,
                usageCount: 0,
                topPurposes: [],
                monthlyUsage: Array(12).fill(0)
            };

            existing.totalUsed += log.quantityUsed;
            existing.usageCount++;
            if (log.usedFor && !existing.topPurposes.includes(log.usedFor)) {
                existing.topPurposes.push(log.usedFor);
            }
            const month = new Date(log.date).getMonth();
            existing.monthlyUsage[month] += log.quantityUsed;

            consumableUsage.set(log.consumableId, existing);
        });

    // 5. Logistics Efficiency
    const periodWaybills = waybills.filter(w => isInPeriod(w.createdAt));
    const completedWaybills = periodWaybills.filter(w => w.status === 'return_completed' || w.status === 'sent_to_site');
    const pendingWaybills = periodWaybills.filter(w => w.status === 'outstanding');
    const logisticsEfficiency = periodWaybills.length > 0 ? (completedWaybills.length / periodWaybills.length) * 100 : 0;

    // Vehicle usage
    const vehicleUsage = new Map<string, number>();
    periodWaybills.forEach(wb => {
        if (wb.vehicle) {
            vehicleUsage.set(wb.vehicle, (vehicleUsage.get(wb.vehicle) || 0) + 1);
        }
    });

    // 6. Employee Accountability
    const employeeAccountability = new Map<string, { outstanding: number; returned: number; lost: number }>();
    checkouts.forEach(co => {
        const existing = employeeAccountability.get(co.employee) || { outstanding: 0, returned: 0, lost: 0 };
        if (co.status === 'outstanding') existing.outstanding++;
        else if (co.status === 'return_completed') existing.returned++;
        else if (co.status === 'lost' || co.status === 'damaged') existing.lost++;
        employeeAccountability.set(co.employee, existing);
    });

    // ============================================
    // GENERATE PDF - TELLING THE STORY
    // ============================================

    // PAGE 1: Executive Summary
    await addHeader();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`OPERATIONS AUDIT REPORT`, 14, 46);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | Prepared for Executive Review`, 14, 52);

    // Executive Summary Narrative
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 58, pageWidth - 28, 35, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Executive Summary: The Operational Story', 18, 66);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const avgEquipUtil = Array.from(equipmentStats.values()).reduce((sum, e) => sum + e.utilizationRate, 0) / (equipmentStats.size || 1);

    const summaryText = `For the period ${dateRangeLabel}, ${companySettings.companyName || 'the company'} managed ${formatNGN(totalValue)} worth of assets across ${activeSites.length} active sites. ` +
        `Portfolio grew by ${growthPercentage.toFixed(1)}% (${formatNGN(netGrowth)}). ` +
        `${loggingEquipment.length} critical equipment units achieved ${avgEquipUtil.toFixed(1)}% average utilization. ` +
        `Logistics completed ${logisticsEfficiency.toFixed(1)}% of ${periodWaybills.length} waybills. ` +
        `${pendingWaybills.length} waybills remain outstanding requiring attention.`;

    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
    doc.text(splitSummary, 18, 74);

    // Financial Performance Table
    autoTable(doc, {
        startY: 98,
        head: [['Financial Metric', `Opening (${formatDate(startDate)})`, `Closing (${formatDate(endDate)})`, 'Change', 'Assessment']],
        body: [
            [
                'Total Asset Value',
                formatNGN(openingValue),
                formatNGN(totalValue),
                formatNGN(netGrowth),
                growthPercentage > 10 ? 'Strong Growth' : growthPercentage > 0 ? 'Stable' : 'Declining'
            ],
            [
                'Asset Count',
                assetsBeforePeriod.length.toString(),
                assets.length.toString(),
                `+${assetsAddedInPeriod.length}`,
                assetsAddedInPeriod.length > 10 ? 'Expanding' : 'Maintaining'
            ],
            [
                'Active Sites',
                (activeSites.length - sitesOpenedInPeriod.length).toString(),
                activeSites.length.toString(),
                `+${sitesOpenedInPeriod.length}`,
                sitesOpenedInPeriod.length > 0 ? 'Expanding' : 'Stable'
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 }
    });

    // Operational KPIs
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Operational KPI', 'Value', 'Target', 'Status']],
        body: [
            ['Equipment Utilization Rate', `${avgEquipUtil.toFixed(1)}%`, '75%', avgEquipUtil >= 75 ? 'On Track' : 'Below Target'],
            ['Logistics Completion Rate', `${logisticsEfficiency.toFixed(1)}%`, '90%', logisticsEfficiency >= 90 ? 'On Track' : 'Needs Improvement'],
            ['Outstanding Waybills', pendingWaybills.length.toString(), '0', pendingWaybills.length === 0 ? 'Clear' : 'Action Required'],
            ['Critical Equipment Logged', loggingEquipment.length.toString(), '-', loggingEquipment.length > 0 ? 'Tracked' : 'No Equipment']
        ],
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
        styles: { fontSize: 8 }
    });

    // Visual Analytics (Charts)
    if (chartImage) {
        doc.addPage();
        await addHeader();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text("Visual Analytics Dashboard", 14, 46);

        const imgWidth = pageWidth - 28;
        const imgHeight = imgWidth * 0.75;
        doc.addImage(chartImage, 'PNG', 14, 54, imgWidth, imgHeight);
    }

    // PAGE 2: Site Operations - Materials Deployed
    doc.addPage();
    await addHeader();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("Site Operations: Materials Deployed", 14, 46);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("Insight: Which sites hold the most resources? Are materials optimally distributed?", 14, 52);

    let yPos = 58;
    for (const site of activeSites.slice(0, 5)) { // Top 5 sites
        const materials = siteMaterialsMap.get(site.id);
        if (!materials || materials.totalItems === 0) continue;

        yPos = await checkPageBreak(yPos, 50);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${site.name} (${site.location || 'N/A'})`, 14, yPos);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Items: ${materials.totalItems} | Total Value: ${formatNGN(materials.totalValue)}`, 14, yPos + 5);

        const topAssets = materials.assets.slice(0, 5);
        if (topAssets.length > 0) {
            autoTable(doc, {
                startY: yPos + 8,
                head: [['Material', 'Quantity', 'Value']],
                body: topAssets.map(a => [a.name, a.qty.toString(), formatNGN(a.value)]),
                theme: 'striped',
                headStyles: { fillColor: [52, 152, 219], fontSize: 7 },
                styles: { fontSize: 7 },
                margin: { left: 14, right: 14 }
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
            yPos += 15;
        }
    }

    // PAGE 3: Equipment Performance (Critical Equipment Only)
    doc.addPage();
    await addHeader();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("Critical Equipment Performance", 14, 46);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("Analysis: Equipment requiring daily logging - these are your revenue generators.", 14, 52);

    const equipmentData = Array.from(equipmentStats.values())
        .sort((a, b) => b.utilizationRate - a.utilizationRate)
        .slice(0, 10)
        .map(eq => [
            eq.name.length > 25 ? eq.name.substring(0, 25) + '...' : eq.name,
            `${eq.activeDays}/${eq.totalDays}`,
            `${eq.utilizationRate.toFixed(1)}%`,
            `${eq.totalFuel.toFixed(0)}L`,
            `${eq.averageFuelPerDay.toFixed(1)}L/day`,
            eq.downtimeReasons.length > 0 ? eq.downtimeReasons[0] : 'None'
        ]);

    autoTable(doc, {
        startY: 58,
        head: [['Equipment', 'Days Active/Total', 'Utilization', 'Total Fuel', 'Avg Fuel/Day', 'Top Downtime Reason']],
        body: equipmentData.length ? equipmentData : [['No logging equipment data available', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96], fontSize: 7 },
        styles: { fontSize: 7 }
    });

    // Equipment Decision Insights
    yPos = (doc as any).lastAutoTable.finalY + 10;
    yPos = await checkPageBreak(yPos, 40);

    doc.setFillColor(255, 249, 235);
    doc.rect(14, yPos, pageWidth - 28, 25, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 100, 0);
    doc.text('Decision Insights:', 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    const underperforming = Array.from(equipmentStats.values()).filter(e => e.utilizationRate < 50);
    const highFuel = Array.from(equipmentStats.values()).filter(e => e.averageFuelPerDay > 20);

    const insights = [];
    if (underperforming.length > 0) {
        insights.push(`${underperforming.length} equipment units below 50% utilization - consider redeployment or disposal.`);
    }
    if (highFuel.length > 0) {
        insights.push(`${highFuel.length} units consuming >20L/day - verify operational necessity.`);
    }
    if (insights.length === 0) {
        insights.push('Equipment utilization is within acceptable parameters.');
    }

    doc.text(insights.slice(0, 2).join(' '), 18, yPos + 12, { maxWidth: pageWidth - 40 });

    // PAGE 4: Consumable Usage Analysis
    doc.addPage();
    await addHeader();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("Consumable Usage Analysis", 14, 46);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("Question: What are we consuming most? Why? Is this aligned with operational needs?", 14, 52);

    const consumableData = Array.from(consumableUsage.values())
        .sort((a, b) => b.totalUsed - a.totalUsed)
        .slice(0, 15)
        .map(c => [
            c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
            `${c.totalUsed.toFixed(1)} ${c.unit}`,
            c.usageCount.toString(),
            (c.totalUsed / (c.usageCount || 1)).toFixed(2),
            c.topPurposes.slice(0, 2).join(', ') || 'Not specified'
        ]);

    autoTable(doc, {
        startY: 58,
        head: [['Consumable', 'Total Used', 'Usage Count', 'Avg Per Use', 'Primary Purpose']],
        body: consumableData.length ? consumableData : [['No consumable logs for this year', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [155, 89, 182], fontSize: 7 },
        styles: { fontSize: 7 }
    });

    // PAGE 5: Logistics & Accountability
    doc.addPage();
    await addHeader();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("Fleet & Logistics Performance", 14, 46);

    const vehicleData = Array.from(vehicleUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => [
            name,
            count.toString(),
            `${((count / periodWaybills.length) * 100).toFixed(1)}%`,
            count > 20 ? 'High Utilization' : count > 10 ? 'Moderate' : 'Low Usage'
        ]);

    autoTable(doc, {
        startY: 52,
        head: [['Vehicle', 'Trips', '% of Total', 'Assessment']],
        body: vehicleData.length ? vehicleData : [['No vehicle data', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
        styles: { fontSize: 8 }
    });

    // Employee Accountability
    yPos = (doc as any).lastAutoTable.finalY + 15;
    yPos = await checkPageBreak(yPos, 60);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(192, 57, 43);
    doc.text("Employee Accountability Summary", 14, yPos);

    const empData = Array.from(employeeAccountability.entries())
        .filter(([_, data]) => data.outstanding > 0 || data.lost > 0)
        .sort((a, b) => (b[1].outstanding + b[1].lost) - (a[1].outstanding + a[1].lost))
        .slice(0, 10)
        .map(([name, data]) => [
            name,
            data.outstanding.toString(),
            data.returned.toString(),
            data.lost.toString(),
            data.lost > 2 ? 'Review Required' : data.outstanding > 5 ? 'Follow Up' : 'Acceptable'
        ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Employee', 'Outstanding', 'Returned', 'Lost/Damaged', 'Action']],
        body: empData.length ? empData : [['All items accounted for', '-', '-', '-', 'Good']],
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43], fontSize: 8 },
        styles: { fontSize: 8 }
    });

    // Footer for all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Page ${i} of ${pageCount} | ${companySettings.companyName || 'DCEL'} Operations Audit (${dateRangeLabel}) | Confidential`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
    }

    const fileName = `${companySettings.companyName || 'DCEL'}_Operations_Audit_${formatDate(startDate).replace(/\//g, '-')}_to_${formatDate(endDate).replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    logger.info("Operations Audit Report Generated");
};
