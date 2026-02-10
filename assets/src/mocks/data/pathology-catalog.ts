import type { PathologyCatalogEntry } from "@/mocks/types";

/**
 * Pathology Catalog — mirrors backend seed data.
 * Each entry includes chronic flag and gender scope for form logic.
 */
export const PathologyCatalog: PathologyCatalogEntry[] = [
  // Digestive / Gastrointestinal
  { id: "ibs-d", name: "Irritable Bowel Syndrome with Diarrhea (IBS-D)", isChronic: true, genderScope: "BOTH" },
  { id: "ibs-c", name: "Irritable Bowel Syndrome with Constipation (IBS-C)", isChronic: true, genderScope: "BOTH" },
  { id: "ibs-m", name: "Irritable Bowel Syndrome, Mixed Type (IBS-M)", isChronic: true, genderScope: "BOTH" },
  { id: "sibo", name: "Small Intestinal Bacterial Overgrowth (SIBO)", isChronic: false, genderScope: "BOTH" },
  { id: "intestinal-dysbiosis", name: "Intestinal Dysbiosis", isChronic: false, genderScope: "BOTH" },
  { id: "intestinal-candidiasis", name: "Intestinal Candidiasis (Fungal Overgrowth)", isChronic: false, genderScope: "BOTH" },
  { id: "chronic-gastritis", name: "Chronic Gastritis", isChronic: true, genderScope: "BOTH" },
  { id: "functional-dyspepsia", name: "Functional Dyspepsia", isChronic: true, genderScope: "BOTH" },
  { id: "gerd", name: "Gastroesophageal Reflux Disease (GERD)", isChronic: true, genderScope: "BOTH" },
  { id: "hiatal-hernia", name: "Hiatal Hernia", isChronic: true, genderScope: "BOTH" },
  { id: "steatorrhea", name: "Steatorrhea (Fat Malabsorption)", isChronic: false, genderScope: "BOTH" },
  { id: "hypochlorhydria", name: "Hypochlorhydria (Low Stomach Acid)", isChronic: true, genderScope: "BOTH" },
  { id: "intestinal-malabsorption", name: "Intestinal Malabsorption Syndrome", isChronic: true, genderScope: "BOTH" },
  { id: "h-pylori-active", name: "Helicobacter Pylori Infection (Active)", isChronic: false, genderScope: "BOTH" },
  { id: "h-pylori-history", name: "Helicobacter Pylori Infection (History of)", isChronic: false, genderScope: "BOTH" },
  { id: "nephrolithiasis", name: "Bilateral Non-Obstructive Nephrolithiasis", isChronic: true, genderScope: "BOTH" },

  // Hormonal & Gynecological
  { id: "pcos-classic", name: "Polycystic Ovary Syndrome (PCOS), Classic Phenotype", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "pcos-atypical", name: "Polycystic Ovary Syndrome (PCOS), Atypical Phenotype", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "hypothalamic-amenorrhea", name: "Hypothalamic Amenorrhea", isChronic: false, genderScope: "FEMALE_ONLY" },
  { id: "post-contraceptive-amenorrhea", name: "Post-Contraceptive Amenorrhea", isChronic: false, genderScope: "FEMALE_ONLY" },
  { id: "insulin-resistance", name: "Insulin Resistance", isChronic: true, genderScope: "BOTH" },
  { id: "reactive-hypoglycemia", name: "Reactive Hypoglycemia", isChronic: true, genderScope: "BOTH" },
  { id: "hashimotos-thyroiditis", name: "Hashimoto's Thyroiditis", isChronic: true, genderScope: "BOTH" },
  { id: "subclinical-hypothyroidism", name: "Subclinical Hypothyroidism", isChronic: true, genderScope: "BOTH" },
  { id: "uterine-leiomyoma", name: "Uterine Leiomyoma (Fibroids)", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "endometriosis", name: "Endometriosis", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "perimenopause", name: "Perimenopause", isChronic: false, genderScope: "FEMALE_ONLY" },
  { id: "cyclic-hormonal-imbalance", name: "Cyclic Hormonal Imbalance", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "postpartum-diastasis-recti", name: "Postpartum Diastasis Recti", isChronic: false, genderScope: "FEMALE_ONLY" },
  { id: "pelvic-floor-dysfunction", name: "Pelvic Floor Dysfunction (Postpartum)", isChronic: false, genderScope: "FEMALE_ONLY" },

  // Metabolic & Hematological
  { id: "type-1-diabetes", name: "Type 1 Diabetes Mellitus", isChronic: true, genderScope: "BOTH" },
  { id: "type-2-diabetes", name: "Type 2 Diabetes Mellitus", isChronic: true, genderScope: "BOTH" },
  { id: "mixed-dyslipidemia", name: "Mixed Dyslipidemia", isChronic: true, genderScope: "BOTH" },
  { id: "hypercholesterolemia", name: "Hypercholesterolemia", isChronic: true, genderScope: "BOTH" },
  { id: "iron-deficiency-anemia", name: "Iron Deficiency Anemia", isChronic: false, genderScope: "BOTH" },
  { id: "low-ferritin", name: "Low Ferritin (Without Anemia)", isChronic: false, genderScope: "BOTH" },
  { id: "beta-thalassemia-minor", name: "Beta Thalassemia Minor", isChronic: true, genderScope: "BOTH" },
  { id: "vitamin-d-deficiency", name: "Vitamin D Deficiency", isChronic: false, genderScope: "BOTH" },

  // Immunological & Autoimmune
  { id: "itp", name: "Immune Thrombocytopenic Purpura (ITP)", isChronic: true, genderScope: "BOTH" },
  { id: "guillain-barre-history", name: "Guillain-Barré Syndrome (History of)", isChronic: false, genderScope: "BOTH" },

  // Neurological & Psychological
  { id: "generalized-anxiety", name: "Generalized Anxiety Disorder", isChronic: true, genderScope: "BOTH" },
  { id: "chronic-stress", name: "Chronic Stress Syndrome", isChronic: false, genderScope: "BOTH" },
  { id: "depression-history", name: "Major Depressive Disorder (History of)", isChronic: false, genderScope: "BOTH" },
  { id: "depression-active", name: "Major Depressive Disorder (Active)", isChronic: false, genderScope: "BOTH" },
  { id: "anorexia-nervosa", name: "Anorexia Nervosa", isChronic: false, genderScope: "BOTH" },
  { id: "bulimia-nervosa", name: "Bulimia Nervosa", isChronic: false, genderScope: "BOTH" },
  { id: "binge-eating-disorder", name: "Binge Eating Disorder", isChronic: false, genderScope: "BOTH" },
  { id: "osfed", name: "Other Specified Feeding or Eating Disorder (OSFED)", isChronic: false, genderScope: "BOTH" },
  { id: "chronic-insomnia", name: "Chronic Insomnia", isChronic: true, genderScope: "BOTH" },
  { id: "sleep-wake-disorder", name: "Sleep-Wake Disorder, Unspecified", isChronic: false, genderScope: "BOTH" },
  { id: "menstrual-migraine", name: "Menstrual Migraine", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "migraine-without-aura", name: "Migraine Without Aura", isChronic: true, genderScope: "BOTH" },

  // Musculoskeletal
  { id: "lumbar-disc-herniation", name: "Lumbar Disc Herniation", isChronic: true, genderScope: "BOTH" },
  { id: "cervical-contracture", name: "Cervical Muscle Contracture", isChronic: false, genderScope: "BOTH" },
  { id: "chronic-low-back-pain", name: "Chronic Low Back Pain", isChronic: true, genderScope: "BOTH" },
  { id: "patellofemoral-chondromalacia", name: "Patellofemoral Chondromalacia", isChronic: true, genderScope: "BOTH" },
  { id: "knee-meniscal-injury", name: "Knee Meniscal Injury", isChronic: false, genderScope: "BOTH" },
  { id: "knee-ligament-injury-history", name: "Knee Ligament Injury (History of)", isChronic: false, genderScope: "BOTH" },
  { id: "ankle-sprain-recurrent", name: "Ankle Sprain (Recurrent)", isChronic: false, genderScope: "BOTH" },
  { id: "healed-fracture", name: "Healed Fracture with Functional Limitation", isChronic: false, genderScope: "BOTH" },
  { id: "lipedema", name: "Lipedema", isChronic: true, genderScope: "FEMALE_ONLY" },
  { id: "chronic-edema", name: "Chronic Edema (Non-Cardiac)", isChronic: true, genderScope: "BOTH" },
  { id: "generalized-arthralgia", name: "Generalized Arthralgia", isChronic: true, genderScope: "BOTH" },
];
