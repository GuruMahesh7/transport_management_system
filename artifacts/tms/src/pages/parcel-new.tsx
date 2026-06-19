import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateParcel, useListHubs, getListParcelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  senderName: z.string().min(1, "Required"),
  senderPhone: z.string().min(10, "Valid phone required"),
  senderEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  senderAddress: z.string().min(1, "Required"),
  receiverName: z.string().min(1, "Required"),
  receiverPhone: z.string().min(10, "Valid phone required"),
  receiverEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  receiverAddress: z.string().min(1, "Required"),
  numBoxes: z.coerce.number().min(1),
  weightKg: z.coerce.number().min(0.1),
  parcelType: z.string().min(1, "Required"),
  charges: z.coerce.number().min(0),
  remarks: z.string().optional(),
  sourceHubId: z.coerce.number().min(1, "Required"),
  destinationHubId: z.coerce.number().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export default function ParcelNew() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: hubs = [] } = useListHubs();
  const createParcel = useCreateParcel();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sourceHubId: user?.hubId ?? undefined,
      numBoxes: 1,
      weightKg: 0,
      charges: 0,
      parcelType: "GENERAL",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const onSubmit = (data: FormValues) => {
    createParcel.mutate({ data }, {
      onSuccess: (parcel) => {
        queryClient.invalidateQueries({ queryKey: getListParcelsQueryKey() });
        toast({ title: "Parcel booked", description: `AWB: ${parcel.awbNumber}` });
        setLocation(`/parcels/${parcel.id}`);
      },
      onError: () => toast({ title: "Error", description: "Failed to create parcel", variant: "destructive" }),
    });
  };

  const activeHubs = hubs.filter(h => h.isActive);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/parcels")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">New Parcel Booking</h2>
          <p className="text-muted-foreground text-sm">AWB will be auto-generated on submit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Sender Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="senderName">Sender Name</Label>
              <Input id="senderName" {...register("senderName")} autoFocus data-testid="input-sender-name" />
              {errors.senderName && <p className="text-destructive text-xs">{errors.senderName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="senderPhone">Phone</Label>
              <Input id="senderPhone" {...register("senderPhone")} data-testid="input-sender-phone" />
              {errors.senderPhone && <p className="text-destructive text-xs">{errors.senderPhone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="senderEmail">Email (optional)</Label>
              <Input id="senderEmail" type="email" {...register("senderEmail")} data-testid="input-sender-email" />
              {errors.senderEmail && <p className="text-destructive text-xs">{errors.senderEmail.message}</p>}
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="senderAddress">Address</Label>
              <Input id="senderAddress" {...register("senderAddress")} data-testid="input-sender-address" />
              {errors.senderAddress && <p className="text-destructive text-xs">{errors.senderAddress.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Receiver Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="receiverName">Receiver Name</Label>
              <Input id="receiverName" {...register("receiverName")} data-testid="input-receiver-name" />
              {errors.receiverName && <p className="text-destructive text-xs">{errors.receiverName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="receiverPhone">Phone</Label>
              <Input id="receiverPhone" {...register("receiverPhone")} data-testid="input-receiver-phone" />
              {errors.receiverPhone && <p className="text-destructive text-xs">{errors.receiverPhone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="receiverEmail">Email (optional)</Label>
              <Input id="receiverEmail" type="email" {...register("receiverEmail")} data-testid="input-receiver-email" />
              {errors.receiverEmail && <p className="text-destructive text-xs">{errors.receiverEmail.message}</p>}
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="receiverAddress">Address</Label>
              <Input id="receiverAddress" {...register("receiverAddress")} data-testid="input-receiver-address" />
              {errors.receiverAddress && <p className="text-destructive text-xs">{errors.receiverAddress.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Parcel Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Boxes</Label>
              <Input type="number" {...register("numBoxes")} data-testid="input-num-boxes" />
              {errors.numBoxes && <p className="text-destructive text-xs">{errors.numBoxes.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" {...register("weightKg")} data-testid="input-weight" />
              {errors.weightKg && <p className="text-destructive text-xs">{errors.weightKg.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Charges (₹)</Label>
              <Input type="number" step="0.01" {...register("charges")} data-testid="input-charges" />
            </div>
            <div className="space-y-1">
              <Label>Parcel Type</Label>
              <Select defaultValue="GENERAL" onValueChange={v => setValue("parcelType", v)}>
                <SelectTrigger data-testid="select-parcel-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="FRAGILE">Fragile</SelectItem>
                  <SelectItem value="PERISHABLE">Perishable</SelectItem>
                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                  <SelectItem value="ELECTRONICS">Electronics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source Hub</Label>
              <Select
                defaultValue={user?.hubId ? String(user.hubId) : undefined}
                onValueChange={v => setValue("sourceHubId", parseInt(v))}
                disabled={user?.role !== "SUPER_ADMIN"}
              >
                <SelectTrigger data-testid="select-source-hub"><SelectValue placeholder="Select hub" /></SelectTrigger>
                <SelectContent>
                  {activeHubs.map(h => <SelectItem key={h.id} value={String(h.id)}>{h.hubName} ({h.hubCode})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.sourceHubId && <p className="text-destructive text-xs">Required</p>}
            </div>
            <div className="space-y-1">
              <Label>Destination Hub</Label>
              <Select onValueChange={v => setValue("destinationHubId", parseInt(v))}>
                <SelectTrigger data-testid="select-dest-hub"><SelectValue placeholder="Select hub" /></SelectTrigger>
                <SelectContent>
                  {activeHubs.map(h => <SelectItem key={h.id} value={String(h.id)}>{h.hubName} ({h.hubCode})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.destinationHubId && <p className="text-destructive text-xs">Required</p>}
            </div>
            <div className="space-y-1 col-span-2 md:col-span-3">
              <Label>Remarks (optional)</Label>
              <Input {...register("remarks")} data-testid="input-remarks" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createParcel.isPending} data-testid="button-submit-booking">
          {createParcel.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Booking"}
        </Button>
      </form>
    </div>
  );
}
