import { Product, Batch } from '../types';

/**
 * 100 Essential Medicines Catalog Dataset (Pure Catalog - Without Price or Quantity)
 * Columns: Barcode, Commercial Name, Scientific Name, Therapeutic Group, Form, Manufacturer / Supplier, Rack Location
 */
export const RAW_100_MEDICINES_CATALOG_TSV = `الباركود\tاسم الدواء التجاري\tالاسم العلمي\tالمجموعة الدوائية\tالشكل\tالشركة المصنعة أو الموردة\tموقع الرف
6291101000001\tأموكسيل 500 ملجم\tAmoxicillin 500mg\tمضادات حيوية\tكبسولات\tGSK / جلاكسو سميث كلاين\tA-101
6291101000002\tأوجمنتين 1 جم\tAmoxicillin + Clavulanate 1g\tمضادات حيوية\tأقراص\tGSK / جلاكسو سميث كلاين\tA-102
6291101000003\tأوجمنتين 625 ملجم\tAmoxicillin + Clavulanate 625mg\tمضادات حيوية\tأقراص\tGSK / جلاكسو سميث كلاين\tA-103
6291101000004\tأزيماك 500 ملجم\tAzithromycin 500mg\tمضادات حيوية\tأقراص\tSPIMACO / سبيماكو الدوائية\tA-104
6291101000005\tسيبرو 500 ملجم\tCiprofloxacin 500mg\tمضادات حيوية\tأقراص\tBayer / شركة باير\tA-105
6291101000006\tفلاجيل 500 ملجم\tMetronidazole 500mg\tمضادات حيوية\tأقراص\tSanofi / شركة سانوفي\tA-106
6291101000007\tسيفترياكسون 1 جم\tCeftriaxone 1g\tمضادات حيوية\tحقن\tRoche / شركة روش\tA-107
6291101000008\tسيفيكس 400 ملجم\tCefixime 400mg\tمضادات حيوية\tكبسولات\tHikma / شركة الحكمة للأدوية\tA-108
6291101000009\tكلاريثرو 500 ملجم\tClarithromycin 500mg\tمضادات حيوية\tأقراص\tAbbott / شركة أبوت\tA-109
6291101000010\tدوكسيسيكلين 100 ملجم\tDoxycycline 100mg\tمضادات حيوية\tكبسولات\tPfizer / شركة فايزر\tA-110
6291101000011\tباراسيتامول 500 ملجم\tParacetamol 500mg\tمسكنات وخافضات حرارة\tأقراص\tشركة سبأ / الصناعات الوطنية\tA-111
6291101000012\tبنادول إكسترا\tParacetamol + Caffeine\tمسكنات وخافضات حرارة\tأقراص\tHaleon / GSK\tA-112
6291101000013\tبروفين 400 ملجم\tIbuprofen 400mg\tمسكنات ومضادات التهاب\tأقراص\tAbbott / شركة أبوت\tA-113
6291101000014\tفولتارين 50 ملجم\tDiclofenac 50mg\tمسكنات ومضادات التهاب\tأقراص\tNovartis / شركة نوفارتس\tA-114
6291101000015\tفولتارين جل\tDiclofenac\tمسكنات ومضادات التهاب\tجل\tNovartis / شركة نوفارتس\tA-115
6291101000016\tكتافلام 50 ملجم\tDiclofenac Potassium 50mg\tمسكنات ومضادات التهاب\tأقراص\tNovartis / شركة نوفارتس\tA-116
6291101000017\tنابروكسين 500 ملجم\tNaproxen 500mg\tمسكنات ومضادات التهاب\tأقراص\tRoche / شركة روش\tA-117
6291101000018\tكيتوبروفين 100 ملجم\tKetoprofen 100mg\tمسكنات ومضادات التهاب\tكبسولات\tSanofi / شركة سانوفي\tA-118
6291101000019\tترامادول 50 ملجم\tTramadol 50mg\tمسكنات قوية\tكبسولات\tGrünenthal / جروننتال\tA-119
6291101000020\tبروفين شراب\tIbuprofen\tمسكنات وخافضات حرارة\tشراب\tAbbott / شركة أبوت\tA-120
6291101000021\tأومول شراب\tParacetamol\tمسكنات وخافضات حرارة\tشراب\tJulphar / شركة جلفار\tA-121
6291101000022\tكونجستال\tParacetamol + Pseudoephedrine\tأدوية البرد والإنفلونزا\tأقراص\tSigma / شركة سيجما\tA-122
6291101000023\tفلودريكس\tParacetamol + Chlorpheniramine\tأدوية البرد والإنفلونزا\tأقراص\tSPIMACO / سبيماكو\tA-123
6291101000024\tنايت كالم\tChlorpheniramine\tأدوية البرد والإنفلونزا\tأقراص\tMash Premiere / ماش بريميير\tA-124
6291101000025\tسيتريزين 10 ملجم\tCetirizine 10mg\tمضادات الحساسية\tأقراص\tUCB Pharma / يو سي بي\tA-125
6291101000026\tلوراتادين 10 ملجم\tLoratadine 10mg\tمضادات الحساسية\tأقراص\tSchering-Plough / شيرينج\tA-126
6291101000027\tديسلوراتادين 5 ملجم\tDesloratadine 5mg\tمضادات الحساسية\tأقراص\tSchering-Plough / شيرينج\tA-127
6291101000028\tكلاريتين\tLoratadine\tمضادات الحساسية\tأقراص\tBayer / شركة باير\tA-128
6291101000029\tأوميبرازول 20 ملجم\tOmeprazole 20mg\tأدوية الجهاز الهضمي\tكبسولات\tAstraZeneca / أسترازينيكا\tA-129
6291101000030\tبانتوبرازول 40 ملجم\tPantoprazole 40mg\tأدوية الجهاز الهضمي\tأقراص\tTakeda / شركة تاكيدا\tA-130
6291101000031\tلانزوبرازول 30 ملجم\tLansoprazole 30mg\tأدوية الجهاز الهضمي\tكبسولات\tTakeda / شركة تاكيدا\tA-131
6291101000032\tجافيسكون\tAlginate + Antacid\tمضادات الحموضة\tشراب\tReckitt Benckiser / ريكيت\tA-132
6291101000033\tمالوكس\tAluminium + Magnesium Hydroxide\tمضادات الحموضة\tشراب\tSanofi / شركة سانوفي\tA-133
6291101000034\tدومبيريدون 10 ملجم\tDomperidone 10mg\tمضادات القيء\tأقراص\tJanssen / شركة يانسن\tA-134
6291101000035\tأوندانسيترون 4 ملجم\tOndansetron 4mg\tمضادات القيء\tأقراص\tGSK / جلاكسو سميث كلاين\tA-135
6291101000036\tميتوكلوبراميد 10 ملجم\tMetoclopramide 10mg\tمضادات القيء\tأقراص\tSanofi / شركة سانوفي\tA-136
6291101000037\tلاكتولوز\tLactulose\tملينات\tشراب\tAbbott / شركة أبوت\tA-137
6291101000038\tبيساكوديل 5 ملجم\tBisacodyl 5mg\tملينات\tأقراص\tBoehringer Ingelheim\tA-138
6291101000039\tدوسباتالين 135 ملجم\tMebeverine 135mg\tمضادات التقلصات\tأقراص\tAbbott / شركة أبوت\tA-139
6291101000040\tسبازموكانوليز\tMebeverine + Chlordiazepoxide\tمضادات التقلصات\tكبسولات\tAmoun / شركة آمون\tA-140
6291101000041\tميتفورمين 500 ملجم\tMetformin 500mg\tأدوية السكري\tأقراص\tMerck / شركة ميرك\tA-141
6291101000042\tجلوكوفاج 850 ملجم\tMetformin 850mg\tأدوية السكري\tأقراص\tMerck Serono / ميرك\tA-142
6291101000043\tجليمبيريد 2 ملجم\tGlimepiride 2mg\tأدوية السكري\tأقراص\tSanofi / شركة سانوفي\tA-143
6291101000044\tإنسولين سريع\tRegular Insulin\tأدوية السكري\tحقن\tNovo Nordisk / نوفو نورديسك\tA-144
6291101000045\tإنسولين NPH\tNPH Insulin\tأدوية السكري\tحقن\tNovo Nordisk / نوفو نورديسك\tA-145
6291101000046\tأملوديبين 5 ملجم\tAmlodipine 5mg\tأدوية الضغط والقلب\tأقراص\tPfizer / شركة فايزر\tA-146
6291101000047\tأملوديبين 10 ملجم\tAmlodipine 10mg\tأدوية الضغط والقلب\tأقراص\tPfizer / شركة فايزر\tA-147
6291101000048\tلوسارتان 50 ملجم\tLosartan 50mg\tأدوية الضغط والقلب\tأقراص\tMSD / ميرك شارب\tA-148
6291101000049\tفالسارتان 80 ملجم\tValsartan 80mg\tأدوية الضغط والقلب\tأقراص\tNovartis / شركة نوفارتس\tA-149
6291101000050\tأتينولول 50 ملجم\tAtenolol 50mg\tأدوية الضغط والقلب\tأقراص\tAstraZeneca / أسترازينيكا\tA-150
6291101000051\tإنالابريل 10 ملجم\tEnalapril 10mg\tأدوية الضغط والقلب\tأقراص\tMSD / ميرك شارب\tA-151
6291101000052\tكابتوبريل 25 ملجم\tCaptopril 25mg\tأدوية الضغط والقلب\tأقراص\tBristol-Myers Squibb\tA-152
6291101000053\tهيدروكلوروثيازيد 25 ملجم\tHydrochlorothiazide 25mg\tمدرات البول\tأقراص\tNovartis / شركة نوفارتس\tA-153
6291101000054\tفوروسيميد 40 ملجم\tFurosemide 40mg\tمدرات البول\tأقراص\tSanofi / شركة سانوفي\tA-154
6291101000055\tأتورفاستاتين 20 ملجم\tAtorvastatin 20mg\tأدوية الدهون\tأقراص\tPfizer / شركة فايزر\tA-155
6291101000056\tروسوفاستاتين 10 ملجم\tRosuvastatin 10mg\tأدوية الدهون\tأقراص\tAstraZeneca / أسترازينيكا\tA-156
6291101000057\tأسبرين 100 ملجم\tAspirin 100mg\tمضادات الصفائح\tأقراص\tBayer / شركة باير\tA-157
6291101000058\tكلوبيدوجريل 75 ملجم\tClopidogrel 75mg\tمضادات الصفائح\tأقراص\tSanofi / شركة سانوفي\tA-158
6291101000059\tنيتروغليسرين\tNitroglycerin\tأدوية القلب\tأقراص\tPfizer / شركة فايزر\tA-159
6291101000060\tديجوكسين 0.25 ملجم\tDigoxin 0.25mg\tأدوية القلب\tأقراص\tAspen / شركة أسبن\tA-160
6291101000061\tبريدنيزولون 5 ملجم\tPrednisolone 5mg\tكورتيكوستيرويدات\tأقراص\tSanofi / شركة سانوفي\tA-161
6291101000062\tديكساميثازون 4 ملجم\tDexamethasone 4mg\tكورتيكوستيرويدات\tحقن\tAspen / شركة أسبن\tA-162
6291101000063\tهيدروكورتيزون 100 ملجم\tHydrocortisone 100mg\tكورتيكوستيرويدات\tحقن\tPfizer / شركة فايزر\tA-163
6291101000064\tبيتاميثازون\tBetamethasone\tكورتيكوستيرويدات\tكريم\tSchering-Plough / شيرينج\tA-164
6291101000065\tفنتولين\tSalbutamol\tأدوية الجهاز التنفسي\tبخاخ\tGSK / جلاكسو سميث كلاين\tA-165
6291101000066\tسالبوتامول 2 ملجم\tSalbutamol 2mg\tأدوية الجهاز التنفسي\tأقراص\tGSK / جلاكسو سميث كلاين\tA-166
6291101000067\tبوديزونيد\tBudesonide\tأدوية الجهاز التنفسي\tاستنشاق\tAstraZeneca / أسترازينيكا\tA-167
6291101000068\tأمبروكسول\tAmbroxol\tأدوية الجهاز التنفسي\tشراب\tBoehringer Ingelheim\tA-168
6291101000069\tأسيتيل سيستئين 600 ملجم\tAcetylcysteine 600mg\tأدوية الجهاز التنفسي\tأقراص فوارة\tZambon / شركة زامبون\tA-169
6291101000070\tكاربوسيستين\tCarbocisteine\tأدوية الجهاز التنفسي\tشراب\tSanofi / شركة سانوفي\tA-170
6291101000071\tميكونازول 2%\tMiconazole 2%\tمضادات الفطريات\tكريم\tJanssen / شركة يانسن\tA-171
6291101000072\tكلوتريمازول 1%\tClotrimazole 1%\tمضادات الفطريات\tكريم\tBayer / شركة باير\tA-172
6291101000073\tفلوكونازول 150 ملجم\tFluconazole 150mg\tمضادات الفطريات\tكبسولات\tPfizer / شركة فايزر\tA-173
6291101000074\tتيربينافين 250 ملجم\tTerbinafine 250mg\tمضادات الفطريات\tأقراص\tNovartis / شركة نوفارتس\tA-174
6291101000075\tأسيكلوفير 400 ملجم\tAcyclovir 400mg\tمضادات الفيروسات\tأقراص\tGSK / جلاكسو سميث كلاين\tA-175
6291101000076\tأسيكلوفير كريم\tAcyclovir\tمضادات الفيروسات\tكريم\tGSK / جلاكسو سميث كلاين\tA-176
6291101000077\tفيوسيدين\tFusidic Acid\tمضادات حيوية موضعية\tكريم\tLEO Pharma / ليو فارما\tA-177
6291101000078\tموبيروسين\tMupirocin\tمضادات حيوية موضعية\tمرهم\tGSK / جلاكسو سميث كلاين\tA-178
6291101000079\tبيتادين\tPovidone Iodine\tمطهرات\tمحلول\tMundipharma / مونديفارما\tA-179
6291101000080\tكحول طبي\tEthanol 70%\tمطهرات\tمحلول\tالشركة الوطنية للمطهرات\tA-180
6291101000081\tفازلين طبي\tPetrolatum\tمستحضرات جلدية\tمرهم\tUnilever / يونيليفر\tA-181
6291101000082\tهيدروكورتيزون كريم\tHydrocortisone\tمستحضرات جلدية\tكريم\tPfizer / شركة فايزر\tA-182
6291101000083\tديكلوفيناك جل\tDiclofenac\tمسكنات موضعية\tجل\tNovartis / شركة نوفارتس\tA-183
6291101000084\tكالامين\tCalamine\tمستحضرات جلدية\tلوسيون\tالشركة الوطنية للصناعات الدوائية\tA-184
6291101000085\tحديد + فوليك\tIron + Folic Acid\tفيتامينات ومعادن\tأقراص\tSPIMACO / سبيماكو\tA-185
6291101000086\tحمض الفوليك 5 ملجم\tFolic Acid 5mg\tفيتامينات ومعادن\tأقراص\tJulphar / شركة جلفار\tA-186
6291101000087\tفيتامين د 50000 وحدة\tVitamin D3 50000 IU\tفيتامينات ومعادن\tكبسولات\tAbbott / شركة أبوت\tA-187
6291101000088\tفيتامين سي 500 ملجم\tVitamin C 500mg\tفيتامينات ومعادن\tأقراص\tBayer / شركة باير\tA-188
6291101000089\tفيتامين ب المركب\tVitamin B Complex\tفيتامينات ومعادن\tأقراص\tSanofi / شركة سانوفي\tA-189
6291101000090\tكالسيوم + فيتامين د\tCalcium + Vitamin D\tفيتامينات ومعادن\tأقراص\tGSK / جلاكسو سميث كلاين\tA-190
6291101000091\tب12 حقن\tCyanocobalamin\tفيتامينات ومعادن\tحقن\tSanofi / شركة سانوفي\tA-191
6291101000092\tمحلول ملحي 0.9%\tSodium Chloride 0.9%\tمحاليل وريدية\tمحلول وريدي\tOtsuka / شركة المحاليل الطبية\tA-192
6291101000093\tجلوكوز 5%\tDextrose 5%\tمحاليل وريدية\tمحلول وريدي\tOtsuka / شركة المحاليل الطبية\tA-193
6291101000094\tرِينجر لاكتات\tRinger Lactate\tمحاليل وريدية\tمحلول وريدي\tOtsuka / شركة المحاليل الطبية\tA-194
6291101000095\tمحلول ملحي للأنف\tSodium Chloride\tأدوية الأنف\tقطرة\tJamjoom Pharma / جمجوم فارما\tA-195
6291101000096\tأوتريفين\tXylometazoline\tأدوية الأنف\tبخاخ\tHaleon / GSK\tA-196
6291101000097\tقطرة توبراميسين\tTobramycin\tأدوية العيون\tقطرة\tNovartis / Alcon\tA-197
6291101000098\tقطرة كلورامفينيكول\tChloramphenicol\tأدوية العيون\tقطرة\tBausch + Lomb / بوش آند لومب\tA-198
6291101000099\tقطرة مرطبة للعين\tArtificial Tears\tأدوية العيون\tقطرة\tAllergan / شركة أليرجان\tA-199
6291101000100\tمرهم للعين\tErythromycin\tأدوية العيون\tمرهم\tJamjoom Pharma / جمجوم فارما\tA-200`;

/**
 * 100 Medicines Full Inventory TSV (with Initial Stock & Realistic Prices)
 */
export const RAW_100_MEDICINES_TSV = `الباركود\tاسم الدواء التجاري\tالاسم العلمي\tالمجموعة الدوائية\tالشكل\tسعر الشراء\tسعر البيع\tسعر الشريط\tالكمية\tرقم التشغيلة\tتاريخ الانتهاء\tالمورد\tموقع الرف
6291101000001\tأموكسيل 500 ملجم\tAmoxicillin 500mg\tمضادات حيوية\tكبسولات\t0\t0\t0\t0\tBAT-0001\t\tGSK / جلاكسو سميث كلاين\tA-101
6291101000002\tأوجمنتين 1 جم\tAmoxicillin + Clavulanate 1g\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0002\t\tGSK / جلاكسو سميث كلاين\tA-102
6291101000003\tأوجمنتين 625 ملجم\tAmoxicillin + Clavulanate 625mg\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0003\t\tGSK / جلاكسو سميث كلاين\tA-103
6291101000004\tأزيماك 500 ملجم\tAzithromycin 500mg\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0004\t\tSPIMACO / سبيماكو الدوائية\tA-104
6291101000005\tسيبرو 500 ملجم\tCiprofloxacin 500mg\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0005\t\tBayer / شركة باير\tA-105
6291101000006\tفلاجيل 500 ملجم\tMetronidazole 500mg\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0006\t\tSanofi / شركة سانوفي\tA-106
6291101000007\tسيفترياكسون 1 جم\tCeftriaxone 1g\tمضادات حيوية\tحقن\t0\t0\t0\t0\tBAT-0007\t\tRoche / شركة روش\tA-107
6291101000008\tسيفيكس 400 ملجم\tCefixime 400mg\tمضادات حيوية\tكبسولات\t0\t0\t0\t0\tBAT-0008\t\tHikma / شركة الحكمة للأدوية\tA-108
6291101000009\tكلاريثرو 500 ملجم\tClarithromycin 500mg\tمضادات حيوية\tأقراص\t0\t0\t0\t0\tBAT-0009\t\tAbbott / شركة أبوت\tA-109
6291101000010\tدوكسيسيكلين 100 ملجم\tDoxycycline 100mg\tمضادات حيوية\tكبسولات\t0\t0\t0\t0\tBAT-0010\t\tPfizer / شركة فايزر\tA-110
6291101000011\tباراسيتامول 500 ملجم\tParacetamol 500mg\tمسكنات وخافضات حرارة\tأقراص\t0\t0\t0\t0\tBAT-0011\t\tشركة سبأ / الصناعات الوطنية\tA-111
6291101000012\tبنادول إكسترا\tParacetamol + Caffeine\tمسكنات وخافضات حرارة\tأقراص\t0\t0\t0\t0\tBAT-0012\t\tHaleon / GSK\tA-112
6291101000013\tبروفين 400 ملجم\tIbuprofen 400mg\tمسكنات ومضادات التهاب\tأقراص\t0\t0\t0\t0\tBAT-0013\t\tAbbott / شركة أبوت\tA-113
6291101000014\tفولتارين 50 ملجم\tDiclofenac 50mg\tمسكنات ومضادات التهاب\tأقراص\t0\t0\t0\t0\tBAT-0014\t\tNovartis / شركة نوفارتس\tA-114
6291101000015\tفولتارين جل\tDiclofenac\tمسكنات ومضادات التهاب\tجل\t0\t0\t0\t0\tBAT-0015\t\tNovartis / شركة نوفارتس\tA-115
6291101000016\tكتافلام 50 ملجم\tDiclofenac Potassium 50mg\tمسكنات ومضادات التهاب\tأقراص\t0\t0\t0\t0\tBAT-0016\t\tNovartis / شركة نوفارتس\tA-116
6291101000017\tنابروكسين 500 ملجم\tNaproxen 500mg\tمسكنات ومضادات التهاب\tأقراص\t0\t0\t0\t0\tBAT-0017\t\tRoche / شركة روش\tA-117
6291101000018\tكيتوبروفين 100 ملجم\tKetoprofen 100mg\tمسكنات ومضادات التهاب\tكبسولات\t0\t0\t0\t0\tBAT-0018\t\tSanofi / شركة سانوفي\tA-118
6291101000019\tترامادول 50 ملجم\tTramadol 50mg\tمسكنات قوية\tكبسولات\t0\t0\t0\t0\tBAT-0019\t\tGrünenthal / جروننتال\tA-119
6291101000020\tبروفين شراب\tIbuprofen\tمسكنات وخافضات حرارة\tشراب\t0\t0\t0\t0\tBAT-0020\t\tAbbott / شركة أبوت\tA-120
6291101000021\tأومول شراب\tParacetamol\tمسكنات وخافضات حرارة\tشراب\t0\t0\t0\t0\tBAT-0021\t\tJulphar / شركة جلفار\tA-121
6291101000022\tكونجستال\tParacetamol + Pseudoephedrine\tأدوية البرد والإنفلونزا\tأقراص\t0\t0\t0\t0\tBAT-0022\t\tSigma / شركة سيجما\tA-122
6291101000023\tفلودريكس\tParacetamol + Chlorpheniramine\tأدوية البرد والإنفلونزا\tأقراص\t0\t0\t0\t0\tBAT-0023\t\tSPIMACO / سبيماكو\tA-123
6291101000024\tنايت كالم\tChlorpheniramine\tأدوية البرد والإنفلونزا\tأقراص\t0\t0\t0\t0\tBAT-0024\t\tMash Premiere / ماش بريميير\tA-124
6291101000025\tسيتريزين 10 ملجم\tCetirizine 10mg\tمضادات الحساسية\tأقراص\t0\t0\t0\t0\tBAT-0025\t\tUCB Pharma / يو سي بي\tA-125
6291101000026\tلوراتادين 10 ملجم\tLoratadine 10mg\tمضادات الحساسية\tأقراص\t0\t0\t0\t0\tBAT-0026\t\tSchering-Plough / شيرينج\tA-126
6291101000027\tديسلوراتادين 5 ملجم\tDesloratadine 5mg\tمضادات الحساسية\tأقراص\t0\t0\t0\t0\tBAT-0027\t\tSchering-Plough / شيرينج\tA-127
6291101000028\tكلاريتين\tLoratadine\tمضادات الحساسية\tأقراص\t0\t0\t0\t0\tBAT-0028\t\tBayer / شركة باير\tA-128
6291101000029\tأوميبرازول 20 ملجم\tOmeprazole 20mg\tأدوية الجهاز الهضمي\tكبسولات\t0\t0\t0\t0\tBAT-0029\t\tAstraZeneca / أسترازينيكا\tA-129
6291101000030\tبانتوبرازول 40 ملجم\tPantoprazole 40mg\tأدوية الجهاز الهضمي\tأقراص\t0\t0\t0\t0\tBAT-0030\t\tTakeda / شركة تاكيدا\tA-130
6291101000031\tلانزوبرازول 30 ملجم\tLansoprazole 30mg\tأدوية الجهاز الهضمي\tكبسولات\t0\t0\t0\t0\tBAT-0031\t\tTakeda / شركة تاكيدا\tA-131
6291101000032\tجافيسكون\tAlginate + Antacid\tمضادات الحموضة\tشراب\t0\t0\t0\t0\tBAT-0032\t\tReckitt Benckiser / ريكيت\tA-132
6291101000033\tمالوكس\tAluminium + Magnesium Hydroxide\tمضادات الحموضة\tشراب\t0\t0\t0\t0\tBAT-0033\t\tSanofi / شركة سانوفي\tA-133
6291101000034\tدومبيريدون 10 ملجم\tDomperidone 10mg\tمضادات القيء\tأقراص\t0\t0\t0\t0\tBAT-0034\t\tJanssen / شركة يانسن\tA-134
6291101000035\tأوندانسيترون 4 ملجم\tOndansetron 4mg\tمضادات القيء\tأقراص\t0\t0\t0\t0\tBAT-0035\t\tGSK / جلاكسو سميث كلاين\tA-135
6291101000036\tميتوكلوبراميد 10 ملجم\tMetoclopramide 10mg\tمضادات القيء\tأقراص\t0\t0\t0\t0\tBAT-0036\t\tSanofi / شركة سانوفي\tA-136
6291101000037\tلاكتولوز\tLactulose\tملينات\tشراب\t0\t0\t0\t0\tBAT-0037\t\tAbbott / شركة أبوت\tA-137
6291101000038\tبيساكوديل 5 ملجم\tBisacodyl 5mg\tملينات\tأقراص\t0\t0\t0\t0\tBAT-0038\t\tBoehringer Ingelheim\tA-138
6291101000039\tدوسباتالين 135 ملجم\tMebeverine 135mg\tمضادات التقلصات\tأقراص\t0\t0\t0\t0\tBAT-0039\t\tAbbott / شركة أبوت\tA-139
6291101000040\tسبازموكانوليز\tMebeverine + Chlordiazepoxide\tمضادات التقلصات\tكبسولات\t0\t0\t0\t0\tBAT-0040\t\tAmoun / شركة آمون\tA-140
6291101000041\tميتفورمين 500 ملجم\tMetformin 500mg\tأدوية السكري\tأقراص\t0\t0\t0\t0\tBAT-0041\t\tMerck / شركة ميرك\tA-141
6291101000042\tجلوكوفاج 850 ملجم\tMetformin 850mg\tأدوية السكري\tأقراص\t0\t0\t0\t0\tBAT-0042\t\tMerck Serono / ميرك\tA-142
6291101000043\tجليمبيريد 2 ملجم\tGlimepiride 2mg\tأدوية السكري\tأقراص\t0\t0\t0\t0\tBAT-0043\t\tSanofi / شركة سانوفي\tA-143
6291101000044\tإنسولين سريع\tRegular Insulin\tأدوية السكري\tحقن\t0\t0\t0\t0\tBAT-0044\t\tNovo Nordisk / نوفو نورديسك\tA-144
6291101000045\tإنسولين NPH\tNPH Insulin\tأدوية السكري\tحقن\t0\t0\t0\t0\tBAT-0045\t\tNovo Nordisk / نوفو نورديسك\tA-145
6291101000046\tأملوديبين 5 ملجم\tAmlodipine 5mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0046\t\tPfizer / شركة فايزر\tA-146
6291101000047\tأملوديبين 10 ملجم\tAmlodipine 10mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0047\t\tPfizer / شركة فايزر\tA-147
6291101000048\tلوسارتان 50 ملجم\tLosartan 50mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0048\t\tMSD / ميرك شارب\tA-148
6291101000049\tفالسارتان 80 ملجم\tValsartan 80mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0049\t\tNovartis / شركة نوفارتس\tA-149
6291101000050\tأتينولول 50 ملجم\tAtenolol 50mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0050\t\tAstraZeneca / أسترازينيكا\tA-150
6291101000051\tإنالابريل 10 ملجم\tEnalapril 10mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0051\t\tMSD / ميرك شارب\tA-151
6291101000052\tكابتوبريل 25 ملجم\tCaptopril 25mg\tأدوية الضغط والقلب\tأقراص\t0\t0\t0\t0\tBAT-0052\t\tBristol-Myers Squibb\tA-152
6291101000053\tهيدروكلوروثيازيد 25 ملجم\tHydrochlorothiazide 25mg\tمدرات البول\tأقراص\t0\t0\t0\t0\tBAT-0053\t\tNovartis / شركة نوفارتس\tA-153
6291101000054\tفوروسيميد 40 ملجم\tFurosemide 40mg\tمدرات البول\tأقراص\t0\t0\t0\t0\tBAT-0054\t\tSanofi / شركة سانوفي\tA-154
6291101000055\tأتورفاستاتين 20 ملجم\tAtorvastatin 20mg\tأدوية الدهون\tأقراص\t0\t0\t0\t0\tBAT-0055\t\tPfizer / شركة فايزر\tA-155
6291101000056\tروسوفاستاتين 10 ملجم\tRosuvastatin 10mg\tأدوية الدهون\tأقراص\t0\t0\t0\t0\tBAT-0056\t\tAstraZeneca / أسترازينيكا\tA-156
6291101000057\tأسبرين 100 ملجم\tAspirin 100mg\tمضادات الصفائح\tأقراص\t0\t0\t0\t0\tBAT-0057\t\tBayer / شركة باير\tA-157
6291101000058\tكلوبيدوجريل 75 ملجم\tClopidogrel 75mg\tمضادات الصفائح\tأقراص\t0\t0\t0\t0\tBAT-0058\t\tSanofi / شركة سانوفي\tA-158
6291101000059\tنيتروغليسرين\tNitroglycerin\tأدوية القلب\tأقراص\t0\t0\t0\t0\tBAT-0059\t\tPfizer / شركة فايزر\tA-159
6291101000060\tديجوكسين 0.25 ملجم\tDigoxin 0.25mg\tأدوية القلب\tأقراص\t0\t0\t0\t0\tBAT-0060\t\tAspen / شركة أسبن\tA-160
6291101000061\tبريدنيزولون 5 ملجم\tPrednisolone 5mg\tكورتيكوستيرويدات\tأقراص\t0\t0\t0\t0\tBAT-0061\t\tSanofi / شركة سانوفي\tA-161
6291101000062\tديكساميثازون 4 ملجم\tDexamethasone 4mg\tكورتيكوستيرويدات\tحقن\t0\t0\t0\t0\tBAT-0062\t\tAspen / شركة أسبن\tA-162
6291101000063\tهيدروكورتيزون 100 ملجم\tHydrocortisone 100mg\tكورتيكوستيرويدات\tحقن\t0\t0\t0\t0\tBAT-0063\t\tPfizer / شركة فايزر\tA-163
6291101000064\tبيتاميثازون\tBetamethasone\tكورتيكوستيرويدات\tكريم\t0\t0\t0\t0\tBAT-0064\t\tSchering-Plough / شيرينج\tA-164
6291101000065\tفنتولين\tSalbutamol\tأدوية الجهاز التنفسي\tبخاخ\t0\t0\t0\t0\tBAT-0065\t\tGSK / جلاكسو سميث كلاين\tA-165
6291101000066\tسالبوتامول 2 ملجم\tSalbutamol 2mg\tأدوية الجهاز التنفسي\tأقراص\t0\t0\t0\t0\tBAT-0066\t\tGSK / جلاكسو سميث كلاين\tA-166
6291101000067\tبوديزونيد\tBudesonide\tأدوية الجهاز التنفسي\tاستنشاق\t0\t0\t0\t0\tBAT-0067\t\tAstraZeneca / أسترازينيكا\tA-167
6291101000068\tأمبروكسول\tAmbroxol\tأدوية الجهاز التنفسي\tشراب\t0\t0\t0\t0\tBAT-0068\t\tBoehringer Ingelheim\tA-168
6291101000069\tأسيتيل سيستئين 600 ملجم\tAcetylcysteine 600mg\tأدوية الجهاز التنفسي\tأقراص فوارة\t0\t0\t0\t0\tBAT-0069\t\tZambon / شركة زامبون\tA-169
6291101000070\tكاربوسيستين\tCarbocisteine\tأدوية الجهاز التنفسي\tشراب\t0\t0\t0\t0\tBAT-0070\t\tSanofi / شركة سانوفي\tA-170
6291101000071\tميكونازول 2%\tMiconazole 2%\tمضادات الفطريات\tكريم\t0\t0\t0\t0\tBAT-0071\t\tJanssen / شركة يانسن\tA-171
6291101000072\tكلوتريمازول 1%\tClotrimazole 1%\tمضادات الفطريات\tكريم\t0\t0\t0\t0\tBAT-0072\t\tBayer / شركة باير\tA-172
6291101000073\tفلوكونازول 150 ملجم\tFluconazole 150mg\tمضادات الفطريات\tكبسولات\t0\t0\t0\t0\tBAT-0073\t\tPfizer / شركة فايزر\tA-173
6291101000074\tتيربينافين 250 ملجم\tTerbinafine 250mg\tمضادات الفطريات\tأقراص\t0\t0\t0\t0\tBAT-0074\t\tNovartis / شركة نوفارتس\tA-174
6291101000075\tأسيكلوفير 400 ملجم\tAcyclovir 400mg\tمضادات الفيروسات\tأقراص\t0\t0\t0\t0\tBAT-0075\t\tGSK / جلاكسو سميث كلاين\tA-175
6291101000076\tأسيكلوفير كريم\tAcyclovir\tمضادات الفيروسات\tكريم\t0\t0\t0\t0\tBAT-0076\t\tGSK / جلاكسو سميث كلاين\tA-176
6291101000077\tفيوسيدين\tFusidic Acid\tمضادات حيوية موضعية\tكريم\t0\t0\t0\t0\tBAT-0077\t\tLEO Pharma / ليو فارما\tA-177
6291101000078\tموبيروسين\tMupirocin\tمضادات حيوية موضعية\tمرهم\t0\t0\t0\t0\tBAT-0078\t\tGSK / جلاكسو سميث كلاين\tA-178
6291101000079\tبيتادين\tPovidone Iodine\tمطهرات\tمحلول\t0\t0\t0\t0\tBAT-0079\t\tMundipharma / مونديفارما\tA-179
6291101000080\tكحول طبي\tEthanol 70%\tمطهرات\tمحلول\t0\t0\t0\t0\tBAT-0080\t\tالشركة الوطنية للمطهرات\tA-180
6291101000081\tفازلين طبي\tPetrolatum\tمستحضرات جلدية\tمرهم\t0\t0\t0\t0\tBAT-0081\t\tUnilever / يونيليفر\tA-181
6291101000082\tهيدروكورتيزون كريم\tHydrocortisone\tمستحضرات جلدية\tكريم\t0\t0\t0\t0\tBAT-0082\t\tPfizer / شركة فايزر\tA-182
6291101000083\tديكلوفيناك جل\tDiclofenac\tمسكنات موضعية\tجل\t0\t0\t0\t0\tBAT-0083\t\tNovartis / شركة نوفارتس\tA-183
6291101000084\tكالامين\tCalamine\tمستحضرات جلدية\tلوسيون\t0\t0\t0\t0\tBAT-0084\t\tالشركة الوطنية للصناعات الدوائية\tA-184
6291101000085\tحديد + فوليك\tIron + Folic Acid\tفيتامينات ومعادن\tأقراص\t0\t0\t0\t0\tBAT-0085\t\tSPIMACO / سبيماكو\tA-185
6291101000086\tحمض الفوليك 5 ملجم\tFolic Acid 5mg\tفيتامينات ومعادن\tأقراص\t0\t0\t0\t0\tBAT-0086\t\tJulphar / شركة جلفار\tA-186
6291101000087\tفيتامين د 50000 وحدة\tVitamin D3 50000 IU\tفيتامينات ومعادن\tكبسولات\t0\t0\t0\t0\tBAT-0087\t\tAbbott / شركة أبوت\tA-187
6291101000088\tفيتامين سي 500 ملجم\tVitamin C 500mg\tفيتامينات ومعادن\tأقراص\t0\t0\t0\t0\tBAT-0088\t\tBayer / شركة باير\tA-188
6291101000089\tفيتامين ب المركب\tVitamin B Complex\tفيتامينات ومعادن\tأقراص\t0\t0\t0\t0\tBAT-0089\t\tSanofi / شركة سانوفي\tA-189
6291101000090\tكالسيوم + فيتامين د\tCalcium + Vitamin D\tفيتامينات ومعادن\tأقراص\t0\t0\t0\t0\tBAT-0090\t\tGSK / جلاكسو سميث كلاين\tA-190
6291101000091\tب12 حقن\tCyanocobalamin\tفيتامينات ومعادن\tحقن\t0\t0\t0\t0\tBAT-0091\t\tSanofi / شركة سانوفي\tA-191
6291101000092\tمحلول ملحي 0.9%\tSodium Chloride 0.9%\tمحاليل وريدية\tمحلول وريدي\t0\t0\t0\t0\tBAT-0092\t\tOtsuka / شركة المحاليل الطبية\tA-192
6291101000093\tجلوكوز 5%\tDextrose 5%\tمحاليل وريدية\tمحلول وريدي\t0\t0\t0\t0\tBAT-0093\t\tOtsuka / شركة المحاليل الطبية\tA-193
6291101000094\tرِينجر لاكتات\tRinger Lactate\tمحاليل وريدية\tمحلول وريدي\t0\t0\t0\t0\tBAT-0094\t\tOtsuka / شركة المحاليل الطبية\tA-194
6291101000095\tمحلول ملحي للأنف\tSodium Chloride\tأدوية الأنف\tقطرة\t0\t0\t0\t0\tBAT-0095\t\tJamjoom Pharma / جمجوم فارما\tA-195
6291101000096\tأوتريفين\tXylometazoline\tأدوية الأنف\tبخاخ\t0\t0\t0\t0\tBAT-0096\t\tHaleon / GSK\tA-196
6291101000097\tقطرة توبراميسين\tTobramycin\tأدوية العيون\tقطرة\t0\t0\t0\t0\tBAT-0097\t\tNovartis / Alcon\tA-197
6291101000098\tقطرة كلورامفينيكول\tChloramphenicol\tأدوية العيون\tقطرة\t0\t0\t0\t0\tBAT-0098\t\tBausch + Lomb / بوش آند لومب\tA-198
6291101000099\tقطرة مرطبة للعين\tArtificial Tears\tأدوية العيون\tقطرة\t0\t0\t0\t0\tBAT-0099\t\tAllergan / شركة أليرجان\tA-199
6291101000100\tمرهم للعين\tErythromycin\tأدوية العيون\tمرهم\t0\t0\t0\t0\tBAT-0100\t\tJamjoom Pharma / جمجوم فارما\tA-200`;

/**
 * Generate 100 Product models without prices or quantities
 */
export function getEssential100MedicinesDataset(includeDefaults = false): { products: Product[]; batches: Batch[] } {
  const lines = RAW_100_MEDICINES_CATALOG_TSV.split('\n').slice(1);
  const products: Product[] = [];
  const batches: Batch[] = [];

  lines.forEach((line, index) => {
    const parts = line.split('\t');
    if (parts.length < 4) return;

    const barcode = parts[0]?.trim() || `6291101000${String(index + 1).padStart(3, '0')}`;
    const name = parts[1]?.trim();
    const scientificName = parts[2]?.trim() || '';
    const category = parts[3]?.trim() || 'أدوية عامة';
    const form = parts[4]?.trim() || 'أقراص';
    const manufacturer = parts[5]?.trim() || 'شركة أدوية عالمية';
    const locationRack = parts[6]?.trim().replace('А', 'A') || `A-${101 + index}`;

    const costPrice = includeDefaults ? 1500 : 0;
    const price = includeDefaults ? 2200 : 0;
    const quantity = includeDefaults ? 30 : 0;

    const productId = `med-100-${String(index + 1).padStart(3, '0')}`;
    const isTabletOrCap = form.includes('أقراص') || form.includes('كبسولات');
    const stripsPerPackage = isTabletOrCap ? 2 : 1;
    const piecesPerStrip = isTabletOrCap ? 10 : 1;

    const product: Product = {
      id: productId,
      barcode,
      name,
      scientificName,
      category,
      form,
      strength: scientificName.match(/(\d+(\.\d+)?\s*(mg|g|ml|mcg|iu|%|ملجم|جم|مل))/i)?.[0] || '',
      manufacturer,
      country: 'مستورد / محلي',
      costPrice,
      price,
      stripPrice: includeDefaults && isTabletOrCap ? Math.round(price / 2) : 0,
      piecePrice: 0,
      stripsPerPackage,
      piecesPerStrip,
      minStock: 5,
      maxStock: 100,
      requiresPrescription: ['مضادات حيوية', 'مسكنات قوية', 'كورتيكوستيرويدات', 'أدوية الضغط والقلب', 'أدوية السكري'].includes(category),
      locationRack,
      vatRate: 0,
      active: true,
      totalQuantity: quantity,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (includeDefaults && quantity > 0) {
      const batch: Batch = {
        id: `bat-100-${String(index + 1).padStart(3, '0')}`,
        productId,
        productName: name,
        batchNumber: `BAT-${String(index + 1).padStart(4, '0')}`,
        expiryDate: '2028-06-30',
        quantity,
        costPrice,
        sellingPrice: price,
        supplierName: manufacturer,
        receivedDate: new Date().toISOString().split('T')[0],
        status: 'active',
      };
      batches.push(batch);
    }

    products.push(product);
  });

  return { products, batches };
}

