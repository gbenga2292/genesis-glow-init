import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Waybill } from "@/types/asset";
import { CalendarIcon } from "lucide-react";

interface SendToSiteDialogProps {
  waybill: Waybill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (waybill: Waybill, sentToSiteDate: Date) => void;
}

export const SendToSiteDialog = ({ waybill, open, onOpenChange, onSend }: SendToSiteDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleSend = () => {
    onSend(waybill, selectedDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Send Waybill to Site
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Select Date Sent to Site</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} className="bg-blue-500 hover:bg-blue-600 text-white">
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
