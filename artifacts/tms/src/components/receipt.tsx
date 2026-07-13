import { format } from "date-fns";

export function Receipt({ parcel }: { parcel: any }) {
  if (!parcel) return null;

  return (
    <div className="hidden print:block w-full max-w-4xl mx-auto bg-white text-black p-4 text-sm" style={{ fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div className="border border-black flex flex-col">
        <div className="flex justify-between items-center border-b border-black p-2">
          <div className="flex flex-col items-center justify-center border border-black p-2 rounded-full w-20 h-20">
            <span className="font-bold text-lg">STC</span>
            <span className="text-[10px] whitespace-nowrap">SIDDIPET TRANSPORT</span>
          </div>
          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-bold text-red-600 mb-1">SIDDIPET TRANSPORT COMPANY</h1>
            <p className="text-xs">BOOKING OFFICE : 15-2-449/2, Opp, Aryasamaj Building, Kishan Gunj, Hyd., Ph : 9866193455, 9392832855</p>
            <p className="text-xs font-bold">H.O. : D.No. 6-1-111, Near Kaman, Siddipet. Cell : 9490200408</p>
          </div>
          <div className="text-right text-xs text-red-600 font-bold min-w-[150px]">
            <p>GSTIN. 36AMNPB0778R1ZD</p>
            <p className="text-lg">Cell : 9392832855</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2 space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">LR Number:</span>
              <span className="font-bold">{parcel.awbNumber}</span>
            </div>
            <div>
              <span className="font-semibold">From: </span>
              {parcel.sourceHubCode}, {parcel.senderPhone}
            </div>
            <div>
              <span className="font-semibold">Consignor: </span>
              {parcel.senderName}, {parcel.senderAddress}
            </div>
          </div>
          <div className="p-2 space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">Booking Time:</span>
              <span>{parcel.createdAt ? format(new Date(parcel.createdAt), "dd/MMM/yyyy h:mm a") : ''}</span>
            </div>
            <div>
              <span className="font-semibold">To: </span>
              {parcel.destinationHubCode}, {parcel.receiverPhone}
            </div>
            <div>
              <span className="font-semibold">Consignee: </span>
              {parcel.receiverName}, {parcel.receiverAddress}, Ph#: {parcel.receiverPhone}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="min-h-[200px] flex flex-col relative">
          <div className="grid grid-cols-12 border-b border-black font-semibold text-center text-xs">
            <div className="col-span-2 p-1 border-r border-black">Quantity</div>
            <div className="col-span-7 p-1 border-r border-black">Description (Said To Contain)</div>
            <div className="col-span-3 p-1">Weight</div>
          </div>
          
          <div className="grid grid-cols-12 flex-1 text-sm">
            <div className="col-span-2 p-2 border-r border-black text-center">{parcel.numBoxes}</div>
            <div className="col-span-7 p-2 border-r border-black">{parcel.parcelType}</div>
            <div className="col-span-3 p-2 text-center relative">
              {parcel.weightKg}
              
              <div className="absolute right-[-40px] top-1/2 transform -translate-y-1/2 rotate-90 origin-right text-lg tracking-widest text-black whitespace-nowrap opacity-60">
                TO-PAY
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="text-6xl font-bold text-center">
              <div>60</div>
              <div className="text-xl">YEARS</div>
            </div>
          </div>
        </div>

        {/* Totals & Remarks */}
        <div className="border-t border-black text-sm">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-9 p-1 border-r border-black flex items-center gap-2">
              <span className="text-xs">Total:</span> <span className="font-semibold">{parcel.numBoxes}</span>
            </div>
            <div className="col-span-3 p-1 flex items-center gap-2">
              <span className="text-xs">Total:</span> <span className="font-semibold">{parcel.weightKg}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-12 border-b border-black text-xs">
            <div className="col-span-4 p-1 flex items-center justify-between border-r border-black">
              <span>Invoice#:</span> <span>---</span>
            </div>
            <div className="col-span-4 p-1 flex items-center justify-between border-r border-black">
              <span>Goods Value:</span> <span>---</span>
            </div>
            <div className="col-span-4 p-1 flex items-center justify-between">
              <span>E-way Bill#:</span> <span>---</span>
            </div>
          </div>
          
          <div className="grid grid-cols-12 border-b border-black text-sm font-semibold">
            <div className="col-span-9 p-2 border-r border-black font-normal flex flex-col justify-between">
               <div><span className="font-semibold">Remarks: </span>{parcel.remarks}</div>
               <div className="text-[10px] mt-4 font-normal">Subject to Siddipet Jurisdiction</div>
            </div>
            <div className="col-span-3">
              <div className="border-b border-black p-2 flex justify-between">
                <span>Grand</span>
                <span>{parcel.charges}</span>
              </div>
              <div className="p-2 h-10 flex items-end">
                For SDPT
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-bold">
          <div className="bg-red-600 text-white p-1">
            Daily Parcel Service :- SIDDIPET, DUBBAK, LACHAPET, MIRDODDI, MUSTHABAD, THOGUTA, CHERIAL, BEJJANKI, CHINNAKODUR, SHANIGARAM, ELLANTHAKUNTA
          </div>
          <div className="p-1 flex justify-between items-center text-red-600">
            <span>Booked at owners risk</span>
            <span>Not responsible for breakages and leakages</span>
            <span>Delivery charges extra</span>
            <span className="bg-red-600 text-white px-2 py-0.5 rounded ml-2">CONSIGNEE COPY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
