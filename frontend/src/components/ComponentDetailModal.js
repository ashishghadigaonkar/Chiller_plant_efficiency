import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, Gauge, Fan, Droplets, Waves, 
  TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function ComponentDetailModal({ component, onClose }) {
  if (!component) return null;

  const getComponentIcon = (type) => {
    switch (type) {
      case 'chiller': return <Gauge className="w-12 h-12" />;
      case 'cooling_tower': return <Fan className="w-12 h-12" />;
      case 'pump': return <Waves className="w-12 h-12" />;
      default: return <Activity className="w-12 h-12" />;
    }
  };

  const getStatusBadge = (color) => {
    if (color === 'green') {
      return <Badge variant="default" className="text-sm">NORMAL</Badge>;
    } else if (color === 'yellow') {
      return <Badge variant="secondary" className="text-sm">WARNING</Badge>;
    } else if (color === 'red') {
      return <Badge variant="destructive" className="text-sm">CRITICAL</Badge>;
    }
    return <Badge variant="outline" className="text-sm">UNKNOWN</Badge>;
  };

  return (
    <Dialog open={!!component} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="component-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {getComponentIcon(component.component_type)}
            <span>{component.component_id}</span>
            {getStatusBadge(component.status_color)}
          </DialogTitle>
          <DialogDescription>
            {component.component_type.replace('_', ' ').toUpperCase()} - Detailed View
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Message */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {component.status_color === 'green' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                )}
                <div>
                  <div className="font-semibold mb-1">Status</div>
                  <div className="text-sm text-muted-foreground">{component.message}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Metrics */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Current Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              {component.power_kw && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Power Consumption</div>
                    <div className="text-2xl font-bold">{component.power_kw.toFixed(1)} kW</div>
                  </CardContent>
                </Card>
              )}
              {component.efficiency_kw_per_tr && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Efficiency</div>
                    <div className="text-2xl font-bold">{component.efficiency_kw_per_tr.toFixed(2)} kW/TR</div>
                  </CardContent>
                </Card>
              )}
              {component.current_load_pct && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Current Load</div>
                    <div className="text-2xl font-bold">{component.current_load_pct.toFixed(0)}%</div>
                  </CardContent>
                </Card>
              )}
              {component.vfd_speed_pct && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">VFD Speed</div>
                    <div className="text-2xl font-bold">{component.vfd_speed_pct.toFixed(0)}%</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {component.recommendations && component.recommendations.length > 0 && (
            <div>
              <Separator className="my-4" />
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {component.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-bold mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
