"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function PaymentSettings() {
  const [minimumPayout, setMinimumPayout] = useState("1000");
  const [payoutSchedule, setPayoutSchedule] = useState("weekly");

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving payment settings...");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Commission Structure</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Platform Commission (%)</Label>
            <div className="text-lg font-semibold text-gray-600">4%</div>
          </div>
          <div>
            <Label>Admin Remains (%)</Label>
            <div className="text-lg font-semibold text-blue-600">96%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Minimum Payout Amount</Label>
          <Input
            type="number"
            value={minimumPayout}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinimumPayout(e.target.value)}
          />
        </div>
        <div>
          <Label>Payout Schedule</Label>
          <Select value={payoutSchedule} onValueChange={setPayoutSchedule}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Payment Settings
      </Button>
    </div>
  );
}