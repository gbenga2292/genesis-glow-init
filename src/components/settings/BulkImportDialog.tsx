import React, { useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ColumnDef {
    key: string;         // field name in the output object
    label: string;       // display name / expected header in Excel
    required?: boolean;
    aliases?: string[];  // alternative header names to match
}

export interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    columns: ColumnDef[];
    onImport: (rows: Record<string, string>[]) => void;
    /** Optional: generate a template download */
    templateFileName?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalise(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchColumn(header: string, col: ColumnDef): boolean {
    const h = normalise(header);
    if (h === normalise(col.key) || h === normalise(col.label)) return true;
    return (col.aliases ?? []).some(a => normalise(a) === h);
}

function mapRow(rawRow: Record<string, unknown>, columns: ColumnDef[]): Record<string, string> {
    const result: Record<string, string> = {};
    const rawKeys = Object.keys(rawRow);
    for (const col of columns) {
        const matchedKey = rawKeys.find(k => matchColumn(k, col));
        result[col.key] = matchedKey ? String(rawRow[matchedKey] ?? '').trim() : '';
    }
    return result;
}

function validateRows(rows: Record<string, string>[], columns: ColumnDef[]) {
    const required = columns.filter(c => c.required);
    return rows.map((row, i) => {
        const missing = required.filter(c => !row[c.key]);
        return { row, index: i + 1, missing };
    });
}

// ── Component ──────────────────────────────────────────────────────────────

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
    open, onOpenChange, title, description, columns, onImport, templateFileName,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [validationResults, setValidationResults] = useState<ReturnType<typeof validateRows>>([]);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parseError, setParseError] = useState<string | null>(null);

    const reset = () => {
        setFileName(null);
        setRows([]);
        setValidationResults([]);
        setStep('upload');
        setParseError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const parseFile = (file: File) => {
        setParseError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
                if (raw.length === 0) {
                    setParseError('The file appears to be empty.');
                    return;
                }
                const mapped = raw.map(r => mapRow(r, columns));
                const validated = validateRows(mapped, columns);
                setRows(mapped);
                setValidationResults(validated);
                setFileName(file.name);
                setStep('preview');
            } catch {
                setParseError('Could not parse the file. Please make sure it is a valid .xlsx or .xls file.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            parseFile(file);
        } else {
            setParseError('Please drop a valid Excel file (.xlsx or .xls).');
        }
    }, [columns]);

    const handleImport = () => {
        const validRows = rows.filter((_, i) => validationResults[i]?.missing.length === 0);
        onImport(validRows);
        handleClose();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.label)]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, templateFileName ?? 'import_template.xlsx');
    };

    const errorCount = validationResults.filter(r => r.missing.length > 0).length;
    const validCount = rows.length - errorCount;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">{title}</DialogTitle>
                            {description && (
                                <DialogDescription className="text-xs mt-0.5">{description}</DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {step === 'upload' && (
                        <>
                            {/* Drop zone */}
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
                                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className={cn("h-10 w-10 mx-auto mb-3", isDragging ? "text-primary" : "text-muted-foreground")} />
                                <p className="text-sm font-medium text-foreground">
                                    {isDragging ? 'Drop your file here' : 'Click to browse or drag & drop'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .xls files</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {parseError && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    {parseError}
                                </div>
                            )}

                            {/* Expected columns */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                    Expected columns
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {columns.map(col => (
                                        <Badge key={col.key} variant={col.required ? 'default' : 'outline'} className="text-xs">
                                            {col.label}{col.required ? ' *' : ''}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5">* Required fields</p>
                            </div>

                            {/* Template download */}
                            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={downloadTemplate}>
                                <Download className="h-3.5 w-3.5" />
                                Download Template (.xlsx)
                            </Button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            {/* Summary bar */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5 text-sm">
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium truncate max-w-[200px]">{fileName}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                    <Badge variant="default" className="gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {validCount} valid
                                    </Badge>
                                    {errorCount > 0 && (
                                        <Badge variant="destructive" className="gap-1">
                                            <XCircle className="h-3 w-3" />
                                            {errorCount} errors
                                        </Badge>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={reset}>
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        Change file
                                    </Button>
                                </div>
                            </div>

                            {errorCount > 0 && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        {errorCount} row{errorCount !== 1 ? 's' : ''} with missing required fields will be skipped.
                                        Only the {validCount} valid row{validCount !== 1 ? 's' : ''} will be imported.
                                    </span>
                                </div>
                            )}

                            {/* Preview table */}
                            <div className="rounded-lg border border-border overflow-hidden">
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/60 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                                                {columns.map(col => (
                                                    <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {validationResults.map(({ row, index, missing }) => (
                                                <tr key={index} className={cn(missing.length > 0 ? 'bg-destructive/5' : '')}>
                                                    <td className="px-3 py-2 text-muted-foreground">{index}</td>
                                                    {columns.map(col => (
                                                        <td key={col.key} className={cn(
                                                            "px-3 py-2 max-w-[140px] truncate",
                                                            missing.some(m => m.key === col.key) ? 'text-destructive font-medium' : 'text-foreground'
                                                        )}>
                                                            {row[col.key] || <span className="text-muted-foreground italic">empty</span>}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2">
                                                        {missing.length === 0
                                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                            : <XCircle className="h-3.5 w-3.5 text-destructive" />
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    {step === 'upload' ? (
                        <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Browse File
                        </Button>
                    ) : (
                        <Button onClick={handleImport} disabled={validCount === 0} className="gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            Import {validCount} {validCount === 1 ? 'Record' : 'Records'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
