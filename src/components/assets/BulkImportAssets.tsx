import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BulkImportAssetsProps {
  onImport: (assets: any[]) => void;
}

export const BulkImportAssets = ({ onImport }: BulkImportAssetsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) {
        setError("Failed to read file");
        return;
      }
      try {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        onImport(jsonData);
        setError(null);
      } catch (err) {
        setError("Error parsing Excel file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to perform bulk import.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Button variant="outline" className="gap-2" onClick={handleClick} disabled={!isAuthenticated}>
        <Upload className="h-4 w-4" />
        Bulk Import
      </Button>
      {error && <p className="text-destructive mt-2">{error}</p>}
      
    </>
  );
};
