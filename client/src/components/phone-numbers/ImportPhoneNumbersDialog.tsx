import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ImportPhoneNumbersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  twilioAccounts: any[];
}

export function ImportPhoneNumbersDialog({ open, onOpenChange, twilioAccounts }: ImportPhoneNumbersDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const queryClient = useQueryClient();
  
  const importMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch('/api/import-twilio-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import phone numbers');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Phone numbers imported",
        description: `Successfully imported ${data.imported.length} phone numbers${data.skipped.length > 0 ? ` (${data.skipped.length} already exist)` : ''}`,
      });
      onOpenChange(false);
      setSelectedAccountId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to import phone numbers",
        description: error.message || "An error occurred while importing numbers from Twilio.",
        variant: "destructive"
      });
    }
  });
  
  const handleImport = () => {
    if (!selectedAccountId) {
      toast({
        title: "Account required",
        description: "Please select a Twilio account to import numbers from.",
        variant: "destructive"
      });
      return;
    }
    
    importMutation.mutate(parseInt(selectedAccountId));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Existing Twilio Numbers</DialogTitle>
          <DialogDescription>
            Import your existing phone numbers from a connected Twilio account. This will only import
            numbers that are not already managed by this platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {twilioAccounts && Array.isArray(twilioAccounts) && twilioAccounts.length > 0 ? (
            <div className="grid gap-2">
              <label htmlFor="twilio-account" className="text-sm font-medium">
                Select Twilio Account
              </label>
              <Select 
                value={selectedAccountId} 
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger id="twilio-account">
                  <SelectValue placeholder="Select a Twilio account" />
                </SelectTrigger>
                <SelectContent>
                  {twilioAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id ? account.id.toString() : `account-${account.accountName}`}>
                      {account.accountName} {account.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded-md">
              You need to connect a Twilio account first before you can import numbers.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!selectedAccountId || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Numbers'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}