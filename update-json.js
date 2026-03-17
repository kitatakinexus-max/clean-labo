const fs = require('fs');
const path = require('path');

const localesDir = 'C:\\Users\\dashm\\Desktop\\meka_tech\\site_maxime\\clean-lab\\locales';
const files = ['fr.json', 'en.json', 'ar.json', 'es.json', 'de.json', 'hi.json'];

const additionalTranslations = {
    fr: {
        expertiseTitle: "Expertise & Conseil",
        expertiseDesc: "Accompagnement personnalisé par nos experts pour solutions sur mesure adaptées à vos besoins spécifiques",
        institutionTitle: "Solutions Institutions",
        videoDemo: "Démonstrations",
        videoTitle: "Voir Nos Solutions en Action",
        videoDesc: "Découvrez nos processus de nettoyage et les résultats obtenus grâce à nos technologies brevetées",
        video1Title: "Processus de Nettoyage SSD",
        video1Desc: "Démonstration complète du processus de nettoyage avec notre solution SSD universelle",
        video2Title: "Résultats Avant/Après",
        video2Desc: "Comparaison visuelle des résultats obtenus sur différents types de billets traités",
        videoMoreInfo: "Besoin de Plus d'Informations ?",
        videoMoreInfoDesc: "Nos experts sont disponibles pour répondre à toutes vos questions et vous proposer une démonstration personnalisée",
        videoCta: "Démonstration Personnalisée"
    },
    en: {
        expertiseTitle: "Expertise & Consulting",
        expertiseDesc: "Personalized support by our experts for tailor-made solutions adapted to your specific needs",
        institutionTitle: "Institution Solutions",
        videoDemo: "Demonstrations",
        videoTitle: "See Our Solutions in Action",
        videoDesc: "Discover our cleaning processes and the results obtained with our patented technologies",
        video1Title: "SSD Cleaning Process",
        video1Desc: "Complete demonstration of the cleaning process with our universal SSD solution",
        video2Title: "Before/After Results",
        video2Desc: "Visual comparison of the results obtained on different types of treated banknotes",
        videoMoreInfo: "Need More Information?",
        videoMoreInfoDesc: "Our experts are available to answer all your questions and offer you a personalized demonstration",
        videoCta: "Personalized Demonstration"
    },
    ar: {
        expertiseTitle: "خبرة واستشارات",
        expertiseDesc: "دعم شخصي من خبرائنا لحلول مصممة خصيصًا لتلبية احتياجاتك الخاصة",
        institutionTitle: "حلول المؤسسات",
        videoDemo: "عروض توضيحية",
        videoTitle: "شاهد حلولنا أثناء العمل",
        videoDesc: "اكتشف عمليات التنظيف لدينا والنتائج التي تم الحصول عليها باستخدام تقنياتنا الحاصلة على براءة اختراع",
        video1Title: "عملية تنظيف SSD",
        video1Desc: "عرض كامل لعملية التنظيف باستخدام حل SSD الشامل لدينا",
        video2Title: "النتائج قبل/بعد",
        video2Desc: "مقارنة مرئية للنتائج التي تم الحصول عليها على أنواع مختلفة من الأوراق النقدية المعالجة",
        videoMoreInfo: "هل تحتاج إلى مزيد من المعلومات؟",
        videoMoreInfoDesc: "خبراؤنا متاحون للإجابة على جميع أسئلتك وتقديم عرض توضيحي مخصص لك",
        videoCta: "عرض توضيحي مخصص"
    },
    es: {
        expertiseTitle: "Experiencia y Consultoría",
        expertiseDesc: "Apoyo personalizado de nuestros expertos para soluciones a medida adaptadas a sus necesidades específicas",
        institutionTitle: "Soluciones para Instituciones",
        videoDemo: "Demostraciones",
        videoTitle: "Vea Nuestras Soluciones en Acción",
        videoDesc: "Descubra nuestros procesos de limpieza y los resultados obtenidos con nuestras tecnologías patentadas",
        video1Title: "Proceso de Limpieza SSD",
        video1Desc: "Demostración completa del proceso de limpieza con nuestra solución SSD universal",
        video2Title: "Resultados Antes/Después",
        video2Desc: "Comparación visual de los resultados obtenidos en diferentes tipos de billetes tratados",
        videoMoreInfo: "¿Necesita más información?",
        videoMoreInfoDesc: "Nuestros expertos están disponibles para responder todas sus preguntas y ofrecerle una demostración personalizada",
        videoCta: "Demostración Personalizada"
    },
    de: {
        expertiseTitle: "Expertise & Beratung",
        expertiseDesc: "Persönliche Betreuung durch unsere Experten für maßgeschneiderte Lösungen, die an Ihre spezifischen Bedürfnisse angepasst sind",
        institutionTitle: "Lösungen für Institutionen",
        videoDemo: "Demonstrationen",
        videoTitle: "Erleben Sie unsere Lösungen in Aktion",
        videoDesc: "Entdecken Sie unsere Reinigungsprozesse und die Ergebnisse, die wir mit unseren patentierten Technologien erzielen",
        video1Title: "SSD-Reinigungsprozess",
        video1Desc: "Vollständige Demonstration des Reinigungsprozesses mit unserer universellen SSD-Lösung",
        video2Title: "Vorher/Nachher-Ergebnisse",
        video2Desc: "Visueller Vergleich der Ergebnisse auf verschiedenen Arten von behandelten Banknoten",
        videoMoreInfo: "Benötigen Sie weitere Informationen?",
        videoMoreInfoDesc: "Unsere Experten stehen zur Verfügung, um alle Ihre Fragen zu beantworten und Ihnen eine personalisierte Vorführung anzubieten",
        videoCta: "Personalisierte Demonstration"
    },
    hi: {
        expertiseTitle: "विशेषज्ञता और परामर्श",
        expertiseDesc: "आपकी विशिष्ट आवश्यकताओं के अनुरूप अनुकूलित समाधान के लिए हमारे विशेषज्ञों द्वारा व्यक्तिगत समर्थन",
        institutionTitle: "संस्थान समाधान",
        videoDemo: "प्रदर्शन",
        videoTitle: "कार्य में हमारे समाधान देखें",
        videoDesc: "हमारी सफाई प्रक्रियाओं और हमारी पेटेंट प्रौद्योगिकियों के साथ प्राप्त परिणामों की खोज करें",
        video1Title: "SSD सफाई प्रक्रिया",
        video1Desc: "हमारे सार्वभौमिक SSD समाधान के साथ सफाई प्रक्रिया का पूरा प्रदर्शन",
        video2Title: "पहले/बाद के परिणाम",
        video2Desc: "विभिन्न प्रकार के उपचारित बैंकनोटों पर प्राप्त परिणामों की दृश्य तुलना",
        videoMoreInfo: "और जानकारी चाहिए?",
        videoMoreInfoDesc: "हमारे विशेषज्ञ आपके सभी सवालों के जवाब देने और आपको एक व्यक्तिगत प्रदर्शन प्रदान करने के लिए उपलब्ध हैं",
        videoCta: "व्यक्तिगत प्रदर्शन"
    }
};

files.forEach(file => {
    const lang = path.basename(file, '.json');
    const filePath = path.join(localesDir, file);
    
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (!data.services) data.services = {};
            data.services.expertiseTitle = additionalTranslations[lang].expertiseTitle;
            data.services.expertiseDesc = additionalTranslations[lang].expertiseDesc;
            data.services.institutionTitle = additionalTranslations[lang].institutionTitle;
            
            if (!data.videos) data.videos = {};
            data.videos.demo = additionalTranslations[lang].videoDemo;
            data.videos.title = additionalTranslations[lang].videoTitle;
            data.videos.desc = additionalTranslations[lang].videoDesc;
            data.videos.processTitle = additionalTranslations[lang].video1Title;
            data.videos.processDesc = additionalTranslations[lang].video1Desc;
            data.videos.resultsTitle = additionalTranslations[lang].video2Title;
            data.videos.resultsDesc = additionalTranslations[lang].video2Desc;
            data.videos.moreInfo = additionalTranslations[lang].videoMoreInfo;
            data.videos.moreInfoDesc = additionalTranslations[lang].videoMoreInfoDesc;
            data.videos.cta = additionalTranslations[lang].videoCta;

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Updated ${file}`);
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});
