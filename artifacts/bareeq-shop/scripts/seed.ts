import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Product } from "../models/Product";

const products = [
  {
    name: "Lujain Celestial Drop Pendant",
    nameAr: "قلادة لُجين بقطرة سماوية",
    price: 680,
    category: "Lujain",
    description: "A luminous sterling-silver pendant, shaped to catch light with a delicate celestial drop.",
    descriptionAr: "قلادة مضيئة من فضة الإسترلينغ، صيغت بقطرة سماوية رقيقة تعكس الضوء.",
  },
  {
    name: "Lujain Trinity Stacking Bands",
    nameAr: "خواتم لُجين الثلاثية",
    price: 420,
    category: "Lujain",
    description: "Three considered silver bands to wear together or separately, finished with quiet brilliance.",
    descriptionAr: "ثلاثة خواتم فضية بلمسة هادئة، تُرتدى معاً أو منفردة.",
  },
  {
    name: "Rawnaq Sculpted Cuff",
    nameAr: "سوار رَوْنَق المنحوت",
    price: 790,
    category: "Rawnaq",
    description: "A sculptural sterling-silver cuff with fluid lines and a beautifully tactile finish.",
    descriptionAr: "سوار منحوت من فضة الإسترلينغ، بخطوط انسيابية وملمس مميز.",
  },
  {
    name: "Wahaj Pavé Halo Earrings",
    nameAr: "أقراط وَهَج بهالة مرصعة",
    price: 960,
    category: "Wahaj",
    description: "Silver halo earrings with a pavé-inspired finish, made for the moments that stay with you.",
    descriptionAr: "أقراط فضية بهالة ولمسة مرصعة، للحظات التي تبقى معكِ.",
  },
];

try {
  await connectDB();
  for (const product of products) {
    await Product.updateOne(
      { name: product.name },
      { $setOnInsert: { ...product, image: "/bareeq-editorial.jpg" } },
      { upsert: true },
    );
  }
  process.stdout.write("Sample products seeded in the independent shop database.\n");
} catch {
  process.stderr.write("Seeding failed. Check MONGODB_URI and MongoDB Atlas network access.\n");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
