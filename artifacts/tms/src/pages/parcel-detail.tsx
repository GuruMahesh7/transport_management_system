import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetParcel, getGetParcelQueryKey, useUpdateParcelStatus, useListComplaints, getListComplaintsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Link } from "wouter";
import { Receipt } from "@/components/receipt";
import { Printer, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useRef } from "react";

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800 border-blue-200",
  RECEIVED_AT_ORIGIN: "bg-cyan-100 text-cyan-800 border-cyan-200",
  DISPATCHED: "bg-amber-100 text-amber-800 border-amber-200",
  RECEIVED_AT_DESTINATION: "bg-indigo-100 text-indigo-800 border-indigo-200",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_ORDER = ["BOOKED", "RECEIVED_AT_ORIGIN", "DISPATCHED", "RECEIVED_AT_DESTINATION", "READY_FOR_PICKUP", "DELIVERED"];

const NEXT_STATUS: Record<string, string> = {
  BOOKED: "RECEIVED_AT_ORIGIN",
  RECEIVED_AT_ORIGIN: "DISPATCHED",
  DISPATCHED: "RECEIVED_AT_DESTINATION",
  RECEIVED_AT_DESTINATION: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "DELIVERED",
};

const NEXT_LABEL: Record<string, string> = {
  BOOKED: "Confirm Receipt at Origin",
  RECEIVED_AT_ORIGIN: "Dispatch",
  DISPATCHED: "Receive at Destination",
  RECEIVED_AT_DESTINATION: "Mark Ready for Pickup",
  READY_FOR_PICKUP: "Mark Delivered",
};

export default function ParcelDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parcelId = parseInt(params.id);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { data: parcel, isLoading } = useGetParcel(parcelId, {
    query: { enabled: !!parcelId, queryKey: getGetParcelQueryKey(parcelId) },
  });

  const updateStatus = useUpdateParcelStatus();

  useEffect(() => {
    if (parcel?.awbNumber) {
      QRCode.toDataURL(parcel.awbNumber, { width: 200 }).then(setQrDataUrl).catch(() => {});
    }
  }, [parcel?.awbNumber]);

  const handleAdvanceStatus = () => {
    if (!parcel) return;
    const nextStatus = NEXT_STATUS[parcel.currentStatus];
    if (!nextStatus) return;
    updateStatus.mutate({ parcelId, data: { status: nextStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetParcelQueryKey(parcelId) });
        toast({ title: "Status updated", description: `Parcel is now ${nextStatus.replace(/_/g, " ")}` });
      },
      onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading parcel...</div>;
  if (!parcel) return <div className="p-8 text-center text-muted-foreground">Parcel not found</div>;

  const currentIdx = STATUS_ORDER.indexOf(parcel.currentStatus);
  const nextStatus = NEXT_STATUS[parcel.currentStatus];

  let canAdvance = false;
  if (user?.role === "SUPER_ADMIN") {
    canAdvance = true;
  } else if (user?.hubId) {
    if (nextStatus === "RECEIVED_AT_ORIGIN" || nextStatus === "DISPATCHED") {
      canAdvance = user.hubId === parcel.sourceHubId;
    } else if (nextStatus === "RECEIVED_AT_DESTINATION" || nextStatus === "READY_FOR_PICKUP" || nextStatus === "DELIVERED") {
      canAdvance = user.hubId === parcel.destinationHubId;
    }
  }

  const handleShare = async () => {
    if (!parcel || !receiptRef.current) return;
    
    setIsSharing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('receipt-capture-container');
          if (el) {
            el.style.display = 'block';
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
          }
        }
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `receipt_${parcel.awbNumber}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Parcel Receipt',
              text: `Receipt for AWB: ${parcel.awbNumber}`,
            });
          } catch (err) {
            // User cancelled share or failed
          }
        } else {
          // Fallback to downloading the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt_${parcel.awbNumber}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({ title: "Receipt Downloaded", description: "Your receipt has been saved." });
        }
      }, 'image/png');
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate receipt image.", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6 print:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/parcels")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold font-mono">{parcel.awbNumber}</h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${STATUS_COLORS[parcel.currentStatus] ?? "bg-gray-100 text-gray-800"}`}>
            {parcel.currentStatus.replace(/_/g, " ")}
          </span>
        </div>
        {canAdvance && nextStatus && (
          <Button className="ml-auto" onClick={handleAdvanceStatus} disabled={updateStatus.isPending} data-testid="button-advance-status">
            {updateStatus.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {NEXT_LABEL[parcel.currentStatus]}
          </Button>
        )}
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${done ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className={`text-xs whitespace-nowrap ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.replace(/_/g, " ")}
                  </span>
                  {i < STATUS_ORDER.length - 1 && <div className={`w-8 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-muted-foreground/30"}`} />}
                </div>
              );
            })}
          </div>

          {parcel.history && parcel.history.length > 0 && (
            <div className="mt-4 space-y-2">
              {[...parcel.history].reverse().map(h => (
                <div key={h.id} className="flex gap-3 text-sm" data-testid={`status-history-${h.id}`}>
                  <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                    {new Date(h.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[h.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {h.status.replace(/_/g, " ")}
                    </span>
                    {h.hubName && <span className="text-muted-foreground ml-2">at {h.hubName}</span>}
                    {h.updatedByName && <span className="text-muted-foreground"> by {h.updatedByName}</span>}
                    {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Sender</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{parcel.senderName}</p>
            <p className="text-muted-foreground">{parcel.senderPhone}</p>
            {parcel.senderEmail && <p className="text-muted-foreground">{parcel.senderEmail}</p>}
            <p className="text-muted-foreground">{parcel.senderAddress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Receiver</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{parcel.receiverName}</p>
            <p className="text-muted-foreground">{parcel.receiverPhone}</p>
            {parcel.receiverEmail && <p className="text-muted-foreground">{parcel.receiverEmail}</p>}
            <p className="text-muted-foreground">{parcel.receiverAddress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Parcel Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{parcel.parcelType}</span></div>
            <div><span className="text-muted-foreground">Boxes:</span> <span className="font-medium">{parcel.numBoxes}</span></div>
            <div><span className="text-muted-foreground">Weight:</span> <span className="font-medium">{parcel.weightKg} kg</span></div>
            <div><span className="text-muted-foreground">Charges:</span> <span className="font-medium">₹{parcel.charges}</span></div>
            <div><span className="text-muted-foreground">Route:</span> <span className="font-medium">{parcel.sourceHubCode} → {parcel.destinationHubCode}</span></div>
            {parcel.remarks && <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span> {parcel.remarks}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">QR Code</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" data-testid="img-qr-code" />
            ) : (
              <div className="w-32 h-32 bg-muted animate-pulse rounded" />
            )}
            <p className="text-xs font-mono text-muted-foreground">{parcel.awbNumber}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
        <Button variant="outline" onClick={handleShare} disabled={isSharing} data-testid="button-share">
          {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
          Share
        </Button>
        <Button variant="outline" onClick={() => setLocation(`/complaints?parcelId=${parcel.id}`)} data-testid="button-raise-complaint">
          Raise Complaint
        </Button>
      </div>
    </div>
    <div id="receipt-capture-container" className="hidden print:block absolute inset-0 bg-white print:static w-full">
      <div ref={receiptRef} className="bg-white min-w-[800px] w-max p-8">
        <Receipt parcel={parcel} />
      </div>
    </div>
    </>
  );
}
