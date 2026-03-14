const fs = require('fs');
const path = require('path');

const localesDir = 'C:\\Users\\dashm\\Desktop\\meka_tech\\site_maxime\\clean-lab\\locales';
const files = ['fr.json', 'en.json', 'ar.json', 'es.json', 'de.json', 'hi.json'];

const translations = {
    fr: {
        seo: {
            title: "Galerie Projets | Réalisations Nettoyage Billets - Clean Laboratoire",
            description: "Découvrez nos réalisations en nettoyage et restauration de billets. Galerie avant/après, résultats concrets et témoignages clients."
        },
        hero: {
            title1: "Notre",
            titleHighlight: "Galerie",
            title2: "de Réalisations",
            subtitle: "Découvrez les résultats concrets de nos interventions en nettoyage et restauration de billets"
        },
        filters: {
            all: "Tous les Projets",
            ssd: "Solution SSD",
            machines: "Machines",
            powder: "Poudres Activation"
        },
        testimonials: {
            title: "Ils Nous Ont Fait Confiance",
            subtitle: "Découvrez les retours de nos clients satisfaits",
            client1Role: "Client Particulier",
            client1Quote: "Des résultats exceptionnels sur mes billets USD. Le processus était rapide et professionnel. Je recommande vivement !",
            client2Role: "Gestionnaire Institutionnel",
            client2Quote: "Le professionnalisme et la discrétion de Clean Laboratoire sont remarquables. Analyses précises et résultats constants.",
            client3Role: "Entrepreneur",
            client3Quote: "La location de machine a boosté notre productivité. Formation excellente et support technique réactif. Partenaire de confiance."
        },
        cta: {
            title: "Prêt à Transformer Vos Billets ?",
            subtitle: "Rejoignez nos nombreux clients satisfaits et obtenez des résultats professionnels",
            btn: "Devis Gratuit"
        },
        loadMore: "Charger Plus de Projets"
    },
    en: {
        seo: {
            title: "Projects Gallery | Banknote Cleaning Achievements - Clean Lab",
            description: "Discover our achievements in banknote cleaning and restoration. Before/after gallery, concrete results and client testimonials."
        },
        hero: {
            title1: "Our",
            titleHighlight: "Gallery",
            title2: "of Achievements",
            subtitle: "Discover the concrete results of our interventions in banknote cleaning and restoration"
        },
        filters: {
            all: "All Projects",
            ssd: "SSD Solution",
            machines: "Machines",
            powder: "Activation Powders"
        },
        testimonials: {
            title: "They Trusted Us",
            subtitle: "Discover the feedback from our satisfied clients",
            client1Role: "Private Client",
            client1Quote: "Exceptional results on my USD notes. The process was fast and professional. I highly recommend!",
            client2Role: "Institutional Manager",
            client2Quote: "The professionalism and discretion of Clean Lab are remarkable. Accurate analysis and consistent results.",
            client3Role: "Entrepreneur",
            client3Quote: "Machine rental boosted our productivity. Excellent training and responsive technical support. A trusted partner."
        },
        cta: {
            title: "Ready to Transform Your Banknotes?",
            subtitle: "Join our many satisfied clients and get professional results",
            btn: "Free Quote"
        },
        loadMore: "Load More Projects"
    },
    es: {
        seo: {
            title: "Galería de Proyectos | Logros en Limpieza de Billetes - Clean Lab",
            description: "Descubra nuestros logros en limpieza y restauración de billetes. Galería antes/después, resultados concretos y testimonios de clientes."
        },
        hero: {
            title1: "Nuestra",
            titleHighlight: "Galería",
            title2: "de Logros",
            subtitle: "Descubra los resultados concretos de nuestras intervenciones en limpieza y restauración de billetes"
        },
        filters: {
            all: "Todos los Proyectos",
            ssd: "Solución SSD",
            machines: "Máquinas",
            powder: "Polvos de Activación"
        },
        testimonials: {
            title: "Ellos Confiaron en Nosotros",
            subtitle: "Descubra los comentarios de nuestros clientes satisfechos",
            client1Role: "Cliente Particular",
            client1Quote: "Resultados excepcionales en mis billetes de USD. El proceso fue rápido y profesional. ¡Lo recomiendo encarecidamente!",
            client2Role: "Gerente Institucional",
            client2Quote: "La profesionalidad y discreción de Clean Lab son notables. Análisis precisos y resultados consistentes.",
            client3Role: "Emprendedor",
            client3Quote: "El alquiler de máquinas impulsó nuestra productividad. Excelente formación y soporte técnico receptivo. Un socio de confianza."
        },
        cta: {
            title: "¿Listo para Transformar sus Billetes?",
            subtitle: "Únase a nuestros numerosos clientes satisfechos y obtenga resultados profesionales",
            btn: "Presupuesto Gratuito"
        },
        loadMore: "Cargar Más Proyectos"
    },
    de: {
        seo: {
            title: "Projektgalerie | Erfolge bei der Banknotenreinigung - Clean Lab",
            description: "Entdecken Sie unsere Erfolge bei der Banknotenreinigung und -restaurierung. Vorher/Nachher-Galerie, konkrete Ergebnisse und Kundenreferenzen."
        },
        hero: {
            title1: "Unsere",
            titleHighlight: "Galerie",
            title2: "der Erfolge",
            subtitle: "Entdecken Sie die konkreten Ergebnisse unserer Eingriffe bei der Banknotenreinigung und -restaurierung"
        },
        filters: {
            all: "Alle Projekte",
            ssd: "SSD-Lösung",
            machines: "Maschinen",
            powder: "Aktivierungspulver"
        },
        testimonials: {
            title: "Sie haben uns vertraut",
            subtitle: "Entdecken Sie das Feedback unserer zufriedenen Kunden",
            client1Role: "Privatkunde",
            client1Quote: "Außergewöhnliche Ergebnisse bei meinen USD-Banknoten. Der Prozess war schnell und professionell. Ich kann es nur wärmstens empfehlen!",
            client2Role: "Institutioneller Manager",
            client2Quote: "Die Professionalität und Diskretion von Clean Lab sind bemerkenswert. Genaue Analysen und konsistente Ergebnisse.",
            client3Role: "Unternehmer",
            client3Quote: "Die Maschinenmiete hat unsere Produktivität gesteigert. Exzellentes Training und reaktionsschneller technischer Support. Ein vertrauenswürdiger Partner."
        },
        cta: {
            title: "Bereit, Ihre Banknoten zu transformieren?",
            subtitle: "Schließen Sie sich unseren vielen zufriedenen Kunden an und erhalten Sie professionelle Ergebnisse",
            btn: "Kostenloses Angebot"
        },
        loadMore: "Mehr Projekte Laden"
    },
    hi: {
        seo: {
            title: "परियोजना गैलरी | बैंकनोट सफाई की उपलब्धियां - Clean Lab",
            description: "बैंकनोट सफाई और बहाली में हमारी उपलब्धियों की खोज करें। पहले/बाद की गैलरी, ठोस परिणाम और ग्राहक प्रशंसापत्र।"
        },
        hero: {
            title1: "हमारी",
            titleHighlight: "गैलरी",
            title2: "उपलब्धियों की",
            subtitle: "बैंकनोट सफाई और बहाली में हमारे हस्तक्षेप के ठोस परिणामों की खोज करें"
        },
        filters: {
            all: "सभी परियोजनाएं",
            ssd: "SSD समाधान",
            machines: "मशीनें",
            powder: "सक्रियण पाउडर"
        },
        testimonials: {
            title: "उन्होंने हम पर भरोसा किया",
            subtitle: "हमारे संतुष्ट ग्राहकों से प्रतिक्रिया खोजें",
            client1Role: "निजी ग्राहक",
            client1Quote: "मेरे USD नोटों पर असाधारण परिणाम। प्रक्रिया तेज़ और पेशेवर थी। मैं अत्यधिक अनुशंसा करता हूँ!",
            client2Role: "संस्थागत प्रबंधक",
            client2Quote: "Clean Lab की व्यावसायिकता और विवेक उल्लेखनीय हैं। सटीक विश्लेषण और लगातार परिणाम।",
            client3Role: "उद्यमी",
            client3Quote: "मशीन किराये ने हमारी उत्पादकता को बढ़ाया। उत्कृष्ट प्रशिक्षण और उत्तरदायी तकनीकी सहायता। एक विश्वसनीय भागीदार।"
        },
        cta: {
            title: "क्या आप अपने बैंकनोटों को बदलने के लिए तैयार हैं?",
            subtitle: "हमारे कई संतुष्ट ग्राहकों से जुड़ें और पेशेवर परिणाम प्राप्त करें",
            btn: "मुफ्त उद्धरण"
        },
        loadMore: "और परियोजनाएँ लोड करें"
    },
    ar: {
        seo: {
            title: "معرض المشاريع | إنجازات تنظيف الأوراق النقدية - Clean Lab",
            description: "اكتشف إنجازاتنا في تنظيف واستعادة الأوراق النقدية. معرض قبل/بعد ، نتائج ملموسة وشهادات العملاء."
        },
        hero: {
            title1: "معرض",
            titleHighlight: "الإنجازات",
            title2: "الخاص بنا",
            subtitle: "اكتشف النتائج الملموسة لتدخلاتنا في تنظيف واستعادة الأوراق النقدية"
        },
        filters: {
            all: "كل المشاريع",
            ssd: "حل SSD",
            machines: "آلات",
            powder: "مساحيق التنشيط"
        },
        testimonials: {
            title: "لقد وثقوا بنا",
            subtitle: "اكتشف تعليقات عملائنا الراضين",
            client1Role: "عميل خاص",
            client1Quote: "نتائج استثنائية على أوراق USD الخاصة بي. كانت العملية سريعة ومهنية. أوصي بشدة!",
            client2Role: "مدير مؤسسي",
            client2Quote: "احترافية وسرية Clean Lab رائعة. تحليل دقيق ونتائج متسقة.",
            client3Role: "رجل أعمال",
            client3Quote: "تأجير الآلات عزز إنتاجيتنا. تدريب ممتاز ودعم فني متجاوب. شريك موثوق."
        },
        cta: {
            title: "هل أنت مستعد لتحويل أوراقك النقدية؟",
            subtitle: "انضم إلى عملائنا الراضين واحصل على نتائج احترافية",
            btn: "اقتباس مجاني"
        },
        loadMore: "تحميل المزيد من المشاريع"
    }
};

files.forEach(file => {
    const lang = path.basename(file, '.json');
    const filePath = path.join(localesDir, file);

    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.projects = translations[lang];
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Updated ${file}`);
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});
