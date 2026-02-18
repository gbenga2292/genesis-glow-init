import { useState } from "react";
import { ResponsiveFormContainer } from "@/components/ui/responsive-form-container";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Waybill } from "@/types/asset";
import { CalendarIcon, Send } from "lucide-react";

interface SendToSiteDialogProps {
  waybill: Waybill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (waybill: Waybill, sentToSiteDate: Date, signWithSignature?: boolean) => void;
}

export const SendToSiteDialog = ({ waybill, open, onOpenChange, onSend }: SendToSiteDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleSend = () => {
    onSend(waybill, selectedDate, signWithSignature);
    onOpenChange(false);
  };

  const [signWithSignature, setSignWithSignature] = useState<boolean>(false);

  return (
    <ResponsiveFormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Send Waybill to Site"
      subtitle={`Waybill ${waybill.id}`}
      icon={<Send className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="date">Select Date Sent to Site</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border mx-auto"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input id="sign-with" type="checkbox" checked={signWithSignature} onChange={(e) => setSignWithSignature(e.target.checked)} />
          <label htmlFor="sign-with" className="text-sm">Sign this waybill with my uploaded signature</label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="h-4 w-4 mr-2" />
            Send to Site
          </Button>
        </div>
      </div>
    </ResponsiveFormContainer>
  );
};
