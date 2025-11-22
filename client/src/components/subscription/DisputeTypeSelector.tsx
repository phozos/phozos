import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, FileQuestion } from 'lucide-react';

interface DisputeTypeSelectorProps {
  value: 'chargeback' | 'dispute';
  onChange: (value: 'chargeback' | 'dispute') => void;
}

export function DisputeTypeSelector({ value, onChange }: DisputeTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Dispute Type</Label>
      <RadioGroup value={value} onValueChange={onChange as (value: string) => void}>
        <Card
          className={`cursor-pointer transition-all ${
            value === 'chargeback' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onChange('chargeback')}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="chargeback" id="chargeback" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <Label htmlFor="chargeback" className="cursor-pointer font-semibold">
                    Chargeback
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  File a formal chargeback request with your payment provider. This is a serious
                  action typically used for unauthorized transactions or service not rendered.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            value === 'dispute' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onChange('dispute')}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="dispute" id="dispute" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileQuestion className="h-5 w-5 text-orange-500" />
                  <Label htmlFor="dispute" className="cursor-pointer font-semibold">
                    General Dispute
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Raise a general dispute about your subscription or payment. Our team will review
                  and work with you to resolve the issue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );
}
