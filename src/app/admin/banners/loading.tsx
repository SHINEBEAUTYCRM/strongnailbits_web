import { Loader2 } from "lucide-react";

export default function BannersLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a855f7" }} />
    </div>
  );
}
