import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image uploads aren't configured yet. See .env.example for BLOB_READ_WRITE_TOKEN." },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const username = (form.get("username") as string | null)?.trim();
    const kind = form.get("kind") as string | null;
    const file = form.get("file") as File | null;

    if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    if (kind !== "image" && kind !== "banner")
      return NextResponse.json({ error: "Invalid upload kind." }, { status: 400 });
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type))
      return NextResponse.json({ error: "Please upload a PNG, JPEG, WEBP, or GIF image." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Image must be under 4MB." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, image: true, banner: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

    const ext = EXT_BY_TYPE[file.type];
    const blob = await put(`profile/${kind}s/${user.id}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const previousUrl = kind === "image" ? user.image : user.banner;
    if (previousUrl) {
      del(previousUrl).catch(() => {});
    }

    await prisma.user.update({
      where: { id: user.id },
      data: kind === "image" ? { image: blob.url } : { banner: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("profile upload error", e);
    return NextResponse.json({ error: "Couldn't upload that image. Please try again." }, { status: 500 });
  }
}
