import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeGeneratedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
}

export function CodeGeneratedDialog({ open, onOpenChange, code }: CodeGeneratedDialogProps) {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Unlock Code Generated Successfully!</DialogTitle>
          <DialogDescription>
            Transaction created and unlock code generated. Please copy and securely store this code.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
            <Label className="text-sm font-medium text-blue-800 mb-2 block">Your Unlock Code</Label>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-wider mb-4">
              {code}
            </p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast({
                  title: "Copied!",
                  description: "Code copied to clipboard",
                });
              }}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Next Steps:</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Copy and securely store this code</p>
              <p>• Send the code to the buyer via WhatsApp/email</p>
              <p>• The code expires in 7 days</p>
              <p>• Once used, the code cannot be reused</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                const message = `Your unlock code: ${code}\nValid for 7 days.`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Share via WhatsApp
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
