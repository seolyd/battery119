import { manifestResponse } from "@/lib/manifest";

export function GET() {
  return manifestResponse("/", "/");
}
