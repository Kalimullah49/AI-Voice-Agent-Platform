import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, PlusCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function BillingPage() {
  // Mocked billing data for display purposes
  const currentPlan = {
    name: "Custom",
    price: 99,
    interval: "monthly",
    features: [
      "Unlimited agents",
      "Unlimited calls",
      "All features included",
      "Priority support"
    ]
  };

  const invoices = [
    { id: "INV-001", date: "2023-08-01", amount: 99, status: "paid" },
    { id: "INV-002", date: "2023-09-01", amount: 99, status: "paid" },
    { id: "INV-003", date: "2023-10-01", amount: 99, status: "paid" },
    { id: "INV-004", date: "2023-11-01", amount: 99, status: "due" }
  ];

  const usageStats = {
    minutesUsed: 642,
    minutesTotal: 1000,
    callsCompleted: 127,
    usagePercentage: 64.2
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
        <Button>
          <CreditCard className="h-4 w-4 mr-2" />
          Manage Subscription
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your current subscription and plan details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">{currentPlan.name} Plan</h3>
                  <p className="text-gray-500">${currentPlan.price}/{currentPlan.interval}</p>
                </div>
                <Badge className="text-lg px-3 py-1">Active</Badge>
              </div>
              
              <div className="space-y-2 mb-6">
                <h4 className="font-medium">Plan Features</h4>
                <ul className="space-y-1">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg 
                        className="h-5 w-5 text-green-500 mr-2" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Minutes Usage</h4>
                    <p className="text-sm text-gray-500">{usageStats.minutesUsed} / {usageStats.minutesTotal} minutes used</p>
                  </div>
                  <Button variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Minutes
                  </Button>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${usageStats.usagePercentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm text-gray-500">
                  Next billing cycle: <span className="font-medium">December 1, 2023</span>
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Configure Auto-Recharge</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure Auto-Recharge</DialogTitle>
                    <DialogDescription>
                      Set up automatic recharging when your minutes run low.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-recharge" className="flex flex-col gap-1">
                        <span>Enable Auto-Recharge</span>
                        <span className="font-normal text-sm text-gray-500">
                          Automatically add minutes when usage exceeds 90%
                        </span>
                      </Label>
                      <Switch id="auto-recharge" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="recharge-amount">Recharge Amount (minutes)</Label>
                      <Input id="recharge-amount" type="number" defaultValue="500" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Configuration</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Manage your payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center p-4 border rounded-lg mb-4">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                  <CreditCard className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Visa ending in 4242</p>
                  <p className="text-sm text-gray-500">Expiry: 12/24</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Billing Contact</CardTitle>
              <CardDescription>
                Manage billing notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing-email">Email Address</Label>
                <Input id="billing-email" defaultValue="admin@example.com" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="invoice-emails" defaultChecked />
                <Label htmlFor="invoice-emails">Receive invoice emails</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="usage-alerts" defaultChecked />
                <Label htmlFor="usage-alerts">Receive usage alerts</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Badge className={invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="ghost" size="sm">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
