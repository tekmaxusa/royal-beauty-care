export interface Service {
  id: string;
  title: string;
  description: string;
  price?: string;
  duration?: string;
  category: string;
  image: string;
}

export interface GiftPackage {
  id: string;
  title: string;
  description: string;
  price: string;
  duration?: string;
  image: string;
  extended?: {
    title: string;
    description: string;
    price: string;
    duration: string;
  };
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

export interface ServiceCategory {
  name: string;
  description: string;
  image: string;
  path: string;
  intro?: {
    title: string;
    content: string;
    benefits?: string;
    recovery?: string;
  };
  instructions?: {
    pre?: string[];
    post?: string[];
    disclaimer?: string;
  };
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: 'Skin Care',
    description: 'Revitalize your complexion with our expert facials, chemical peels, and advanced skin treatments.',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800',
    path: '/services/skin-care'
  },
  {
    name: 'Microblading & Permanent Makeup',
    description: 'Wake up with effortless perfection with our expert permanent cosmetic applications for eyes and lips.',
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefce4f40?auto=format&fit=crop&q=80&w=1920',
    path: '/services/permanent-makeup'
  },
  {
    name: 'Body Treatments',
    description: 'Plunge into peace with our luxurious body wraps and treatments designed to detoxify and nourish your skin.',
    image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800',
    path: '/services/body-treatments'
  },
  {
    name: 'Laser Hair Removal Services',
    description: 'Enjoy the liberty of silky, hairless skin with our state-of-the-art laser technology for all skin types.',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800',
    path: '/services/laser-hair-removal',
    instructions: {
      pre: [
        'Shun sun exposure and tanning beds for at least 2 weeks before.',
        'Shave the target area 24 hours ahead of your session.',
        'Refrain from waxing, plucking, or threading for 4 weeks pre-treatment.',
        'Come with clean skin, void of lotions, oils, or deodorantsss.'
      ],
      post: [
        'Stay out of direct sun and use sunscreen (SPF 30+) every day.',
        'Steer clear of hot showers, saunas, and heavy exercise for 24 hours.',
        'Mildly exfoliate the treated zone 1 week post-therapy.',
        'Use calming aloe vera gel if redness appearsss.'
      ],
      disclaimer: 'Outcomes may differ. A consultation is advised to decide the optimal therapy plan for your skin and hair typess.'
    }
  },
  {
    name: 'CO2 Fractional',
    description: 'Discover the premier choice in skin resurfacing for striking renewal and texture enhancement.',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
    path: '/services/co2-fractional',
    intro: {
      title: 'The Innovation of Restoration',
      content: 'CO2 Fractional laser tech represents a groundbreaking leap in aesthetic care. By transmitting focused light beams that form tiny pathways in the skin, it activates the body\'s innate healing mechanism. This prompts the generation of fresh collagen and elastin, swapping harmed skin for new, robust tissue.',
      benefits: 'Major decrease in deep furrows, fine lines, acne marks, and irregular pigmentation.',
      recovery: 'Recovery time usually spans 3 to 7 days, during which you might see redness and flaking as your glowing new skin emerges.'
    }
  },
  {
    name: 'Injectable Treatments',
    description: 'Precision treatments for timeless rejuvenation. Restore volume, smooth wrinkles, and refine your features with our advanced medical aesthetic services.',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800',
    path: '/services/injectables',
    intro: {
      title: 'Why Opt for Injectables?',
      content: 'At Royal Beauty Care, we use only the most trusted and advanced injectable products to ensure natural-looking, beautiful results. Our expert practitioners combine medical precision with an artistic eye to enhance your natural beauty.',
      benefits: 'FDA Approved Products, Expert Practitioners, Natural Looking Results, Minimal Downtime',
      recovery: 'Medical Consultation Required. All injectable treatments require a prior consultation to ensure eligibility and discuss your medical history. Please avoid blood-thinning supplements or alcohol for 48 hours before your appointment to minimize bruising.'
    },
    instructions: {
      pre: [
        'Avoid blood-thinning medications (like Aspirin) for 1 week before.',
        'Do not consume alcohol for 24 hours prior to your session.',
        'Inform us of any history of cold sores if treating the lip area.',
        'Arrive with a clean face free of makeup if possible.'
      ],
      post: [
        'Do not massage or apply pressure to the treated area for 24 hours.',
        'Stay upright for at least 4 hours after Botox/Dysport injections.',
        'Avoid strenuous exercise and intense heat (saunas) for 24-48 hours.',
        'Apply cold compresses gently if any swelling or bruising occurs.'
      ],
      disclaimer: 'Individual results may vary. A personal consultation is required to determine the best treatment plan for your specific needs.'
    }
  },
  {
    name: 'Eyebrow Tinting',
    description: 'Enhance your gaze with our specialized brow and lash services, designed to define, lift, and beautify your most expressive features.',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800',
    path: '/services/eyebrow-tinting',
    intro: {
      title: 'Premium Eyebrow Tinting',
      content: 'Enhance your gaze with our specialized brow and lash services, designed to define, lift, and beautify your most expressive features.'
    }
  },
  {
    name: 'Gentleman Services',
    description: 'Distinguished Men\'s Care. Customized grooming therapies crafted to revive energy, alleviate tension, and uphold a crisp, executive look.',
    image: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?auto=format&fit=crop&q=80&w=800',
    path: '/services/gentleman',
    intro: {
      title: 'Why Opt for Gentleman Services?',
      content: 'Modern grooming is more than just a routine; it\'s an investment in your confidence and well-being. Our specialized treatments are designed to address the unique needs of men\'s skin and lifestyle.',
      benefits: 'Targeted Skin Care, Stress Relief, Executive Grooming, Enhanced Confidence'
    },
    instructions: {
      pre: [
        'Avoid direct sun exposure for 24 hours.',
        'Come with a clean, shaven face if receiving a facial (unless specified otherwise).',
        'Hydrate well before your appointment.'
      ],
      post: [
        'Apply recommended moisturizer daily.',
        'Avoid harsh soaps or exfoliants for 48 hours.',
        'Use SPF 30+ if spending time outdoors.'
      ],
      disclaimer: 'Consistent care leads to lasting results. Always follow your technician\'s specific advice.'
    }
  },
  {
    name: 'Threading Services',
    description: 'Expert Threading Techniques. Time-honored hair removal for flawlessly sculpted brows and silky skin.',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800',
    path: '/services/threading',
    intro: {
      title: 'Expert Threading Techniques',
      content: 'Originating in Central Asia and India, threading is a refined hair removal technique. Our experts use a twisted cotton thread to lift hair from the root with exacting precision. Unlike waxing, this method preserves the top layer of skin, making it a superior choice for sensitive skin or those using medications such as Retin-A or Accutane.'
    }
  },
  {
    name: 'Eyelash Extensions',
    description: 'Enhance your natural beauty with our premium lash services. Expertly applied for a flawless, long-lasting gaze.',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=1920',
    path: '/services/eyelash-extensions'
  },
  {
    name: 'Waxing',
    description: 'Premium Waxing Treatments. Achieve silky, smooth skin with our expert waxing services, tailored for your comfort and precise results.',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800',
    path: '/services/waxing'
  },
  {
    name: 'Beauty Products',
    description: 'Luxurious Beauty Products. Bring the royal spa experience home with our professional-grade collections.',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800',
    path: '/services/beauty-products',
    intro: {
      title: 'Elevate Your Daily Rituals',
      content: 'Achieving radiant, healthy skin doesn\'t end when you leave our spa. We believe that home care is an extension of our professional treatments. Our carefully curated selection of beauty products is formulated with high concentrations of active ingredients to target specific concerns, maintain skin health, and enhance the longevity of your treatment results. From deep-cleansing washes to potent anti-aging serums, each product represents the pinnacle of skincare science, ensuring that you can experience the Royal Beauty Care standard of excellence every single day.'
    }
  }
];

export const CONTACT_INFO = {
  address: "9226 Teddy Ln, Lone Tree, CO 80124",
  phone: "303-353-8153",
  email: "skincare108@yahoo.com",
  website: "www.royalbeautycare.us",
  hours: "Mon - Sat: 10:00 AM - 7:00 PM, Sun: Closed",
  paymentNote: "We do not accept Visa or Mastercard Gift Cards"
};

export const SERVICES: Service[] = [
  // Skin Care
  {
    id: 'anti-aging-facial',
    title: 'Anti-Aging Facial',
    description: 'This deeply hydrating treatment re-balances skins hydro-lipid film. Also includes enzyme exfoliation, ampoules rich in vitamins A, B, C, D, E & K, and a multi-functional Anti-Aging mask with Peptides, Isoflavones and Stem Cells to relax facial muscles and soothe skins texture, leaving your skin radiant and youthful. A neck and shoulder massage is included to leave you relaxed and refreshed.',
    price: '$145.00',
    duration: '100-140 Mins',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'deep-facial-cleaning',
    title: 'Deep Facial Cleaning',
    description: 'Deep cleansing facial focusing on professional extraction of blackheads and mask application to remove impurities. Depicts glowing skin, luxurious skincare products, and total relaxation during the treatment.',
    price: '$120.00',
    duration: '45 - 60 min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'shahanaz-gold-facial',
    title: 'Shahanaz Gold Facial',
    description: 'A luxurious, anti-ageing treatment designed to rejuvenate skin, improve texture, and provide a radiant, youthful glow using 24-carat pure gold leaf combined with natural botanical extracts.',
    price: '$125.00',
    duration: '90 - 120 min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'basic-facial-cleaning',
    title: 'Basic Facial Cleaning',
    description: 'Refresh and revitalize your skin. This relaxing facial is designed to gently cleanse, exfoliate, and remove impurities, leaving your skin feeling fresh, smooth, and healthy.',
    price: '$95.00',
    duration: '45-60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'hydrating-facial-vitamin-c',
    title: 'Hydrating Facial with Vitamin C',
    description: 'Restore your skin’s moisture and natural glow. This nourishing treatment deeply hydrates while delivering powerful antioxidants that help brighten and rejuvenate your complexion.',
    price: '$120.00',
    duration: '60 - 90 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'shahanaz-diamond-facial',
    title: 'Shahanaz Diamond Facial',
    description: 'Designed to deeply cleanse, brighten, and rejuvenate your skin using diamond-infused products that help gently exfoliate dead skin cells and improve skin texture.',
    price: '$125.00',
    duration: '60 - 90 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'microdermabrasion-exfoliation',
    title: 'Microdermabrasion Exfoliation',
    description: 'Reveal smoother, brighter skin. This advanced procedure gently removes dead skin cells using specialized technology to improve skin texture and clarity.',
    price: '$135.00',
    duration: '60 - 90 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'acne-facial-extraction',
    title: 'Acne, facial extraction and exfoliating',
    description: 'Deep-cleansing facial focusing on removing impurities, unclogging pores, and reducing breakouts. Includes gentle exfoliation and careful extractions.',
    price: '$145.00',
    duration: '60 - 90 min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'led-facial',
    title: 'LED Facial',
    description: 'Non-invasive therapy using specialized light technology to help improve skin health, reduce signs of aging, and promote a clearer complexion.',
    price: '$125.00',
    duration: '60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'chemical-peel',
    title: 'Chemical Peel',
    description: 'Advanced exfoliating procedure that helps remove damaged outer layers of skin to reveal a smoother, brighter, and more even complexion.',
    price: '$175 - $300',
    duration: '60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'oxygen-infusion',
    title: 'Oxygen infusion treatment',
    description: 'Refreshing facial designed to deeply hydrate and brighten the complexion by delivering a stream of oxygen infused with vitamins directly into the skin.',
    price: '$165.00',
    duration: '60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'hydro-facial-new',
    title: 'Hydro facial',
    description: 'Ultimate in skin hydration and rejuvenation. Uses gentle water-based exfoliation combined with deep cleansing to remove impurities and nourish your skin.',
    price: '$155.00',
    duration: '60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'microneedling-collagen',
    title: 'Micro needling treatment (collagen induction therapy)',
    description: 'Stimulates collagen and elastin production using tiny, precise needles to create micro-channels, reducing fine lines and improving texture.',
    price: '$300.00',
    duration: '60 Min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'dermaplaning-new',
    title: 'Dermaplaning',
    description: 'Gentle exfoliation technique using a specialized blade to remove dead skin cells and peach fuzz, leaving your skin soft and glowing.',
    price: '$150.00',
    duration: '60 - 90 min',
    category: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  // Body Treatments
  {
    id: 'royal-body-scrub',
    title: 'Royal Body Scrub & Glow',
    description: 'Reveal radiant skin with our signature exfoliation. We use a custom blend of Himalayan salts and essential oils to sweep away dull cells, followed by a nourishing hydration wrap that leaves your skin feeling exceptionally soft and luminous. Perfect before a vacation or special event for a natural, healthy glow.',
    price: '$110.00',
    duration: '60 Minutes',
    category: 'Body Treatments',
    image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'detox-mud-wrap',
    title: 'Detoxifying Mud Wrap',
    description: 'Draw out impurities and improve skin texture with our mineral-rich volcanic mud wrap. While the mud works its magic, enjoy a relaxing scalp massage. This treatment helps reduce water retention and detoxifies the lymphatic system.',
    price: '$135.00',
    duration: '75 Minutes',
    category: 'Body Treatments',
    image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'cellulite-therapy',
    title: 'Targeted Cellulite Therapy',
    description: 'Combine the power of dry brushing, localized caffeine-infused serums, and deep tissue massage to improve circulation and smooth the appearance of cellulite in targeted areas like thighs and buttocks.',
    price: '$150.00',
    duration: '60 Minutes',
    category: 'Body Treatments',
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800'
  },
  // Laser
  {
    id: 'laser-full-back',
    title: 'Full Back Laser',
    description: 'Experience the ultimate freedom of a permanently smooth back. Our advanced laser technology efficiently targets large areas, providing a comfortable treatment that eliminates the need for shaving or painful waxing.',
    price: '$150.00 (Single) | $750.00 (6 Sessions)',
    category: 'Laser Hair Removal Services',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'laser-underarms',
    title: 'Underarms Laser',
    description: 'Say goodbye to dark shadows and daily shaving. Underarm laser hair removal is quick, effective, and leaves your skin feeling silky smooth every day.',
    price: '$50.00 (Single) | $250.00 (6 Sessions)',
    category: 'Laser Hair Removal Services',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'laser-full-legs',
    title: 'Full Legs Laser',
    description: 'Achieve effortlessly beautiful legs all year round. This comprehensive treatment covers from the ankle to the upper thigh, ensuring total coverage and long-lasting results.',
    price: '$200.00 (Single) | $1000.00 (6 Sessions)',
    category: 'Laser Hair Removal Services',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'laser-brazilian',
    title: 'Brazilian Laser',
    description: 'Total confidence and hygiene with our professional Brazilian laser hair removal. Our experienced technicians ensure a discreet and comfortable experience with maximum effectiveness.',
    price: '$100.00 (Single) | $500.00 (6 Sessions)',
    category: 'Laser Hair Removal Services',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-full-facial',
    title: 'Complete Facial Resurfacing',
    description: 'Our all-inclusive Complete Facial Resurfacing therapy is crafted to tackle overall skin hue and feel. This potent process aims at sun harm, age marks, and fine lines over the whole face. By eliminating the outer tiers of ruined skin, it exposes a sleeker, tighter, and more youthful look underneath. Note: We advise a consultation before booking to evaluate skin fitness and talk over pre-care steps.',
    price: '$600.00',
    duration: '60 Minutes',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-neck-chest',
    title: 'Neck & Chest Area',
    description: 'Expand the revitalizing perks of laser care to the fragile skin of your neck and chest. These zones frequently display aging and sun harm first. Our focused CO2 therapy aids in lessening "tech neck" creases, crinkling, and sun marks, bringing back a uniform, youthful look from face to chest. Add-On Option: Pair with Complete Facial Resurfacing for a total makeover and exclusive bundle rates.',
    price: '$450.00',
    duration: '45 Minutes',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-scar-therapy',
    title: 'Focused Scar Therapy',
    description: 'Pinpointed aid for specific flaws. This concentrated laser session is perfect for healing deep acne marks, surgical scars, or single pigment spots. The laser dissolves scar tissue and promotes healthy cell rebirth for a smoother feel.',
    price: 'Starting at $150.00',
    duration: '30 Mins',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-consult',
    title: 'Consult & Evaluation',
    description: 'Uncertain which therapy suits you? Our skilled estheticians will examine your skin type and issues to build a bespoke CO2 fractional strategy fitted to your recovery schedule and beauty aims.',
    price: 'Complimentary',
    duration: '15 Minutes',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-bundle-offers',
    title: 'CO2 Bundle Offers',
    description: 'Gain peak results with a sequence of sessions. Collagen creation keeps improving for months post-treatment. Add-On Option: Pair with Complete Facial Resurfacing for a total makeover and exclusive bundle rates.',
    price: 'Starting at $150.00',
    duration: '30 Mins',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1549465220-1d8c9d9c6703?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'co2-aftercare',
    title: 'Aftercare Must-Haves',
    description: 'Your Royal Beauty Care CO2 journey covers a top-tier post-op kit. We supply mild cleansers, specific moisturizers, and superior SPF to guard your investment and guarantee a cozy, fast healing.',
    price: 'Starting at $150.00',
    duration: '30 Mins',
    category: 'CO2 Fractional',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  // Injectables
  {
    id: 'botox-cosmetics',
    title: 'Botox Cosmetics',
    description: 'Softens fine lines and wrinkles by temporarily relaxing the underlying muscles. Perfect for forehead lines, crow\'s feet, and frown lines. Results typically last 3-4 months.',
    price: '$14.00/unit',
    duration: '15-30 Mins',
    category: 'Injectable Treatments',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'derma-fillers-juvederm',
    title: 'Derma fillers ( Juvederm)',
    description: 'Dermal fillers for the face have emerged as a popular cosmetic treatment for achieving beautiful, youthful skin. Due to the short recovery period and immediate results, many people decide to have these injections.',
    price: '$500 / syringe',
    duration: '60 Mins',
    category: 'Injectable Treatments',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  // Permanent Makeup
  {
    id: 'microblading-new',
    title: 'Microblading',
    description: 'Achieve the look of full, natural brows with this semi-permanent tattooing technique. Using a manual tool, we create fine, hair-like strokes that mimic the natural growth of your eyebrows, perfect for filling in sparse areas or redefining your shape.',
    price: '$350.00',
    duration: '2-3 Hours',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefce4f40?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3d-eyebrow',
    title: '3D Eyebrow (microblading)',
    description: '3D Eyebrow Microblading is a semi-permanent makeup technique that uses a hand-held tool with tiny needles to create hyper-realistic, hair-like strokes, providing a fuller, more defined, and natural-looking appearance to the brows. Includes free one-time Touch-Up.',
    price: '$500',
    duration: '60 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'microblading-touchup',
    title: 'Microblading Touch up',
    description: 'A microblading touch-up (typically 6–8 weeks post-initial session) is a perfecting appointment that fixes color unevenness, fills in sparse spots, and reinforces faded pigment. It ensures long-lasting results by refining the shape.',
    price: '$250',
    duration: '60 - 120 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'powder-brow',
    title: 'Powder Brow',
    description: 'Powder brows are a semi-permanent, superficial tattooing technique that creates a soft, filled-in, "powdered" makeup look on the eyebrows. Using a specialized machine and fine needles, pigment is deposited in tiny pixels to create a soft, powdery effect.',
    price: '$500',
    duration: '60 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'lash-line-enhancement',
    title: 'Lash line Enhancement',
    description: 'Lash Line Enhancement is a semi-permanent makeup technique that deposits pigment between the lashes to create the illusion of fuller, thicker, and darker lashes. Subtle, natural, and "no-makeup" look.',
    price: '$500',
    duration: '30 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'powder-brow-touchup',
    title: 'Powder Brow touch up after one year',
    description: 'A touch-up for powder brows to maintain the soft, powdered makeup look. Refreshes pigment and ensures long-lasting results.',
    price: '$250.00',
    duration: '120 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'lip-blush',
    title: 'Lip blush',
    description: 'Lip blushing is a semi-permanent cosmetic tattoo that enhances the natural color, shape, and definition of the lips. Creates a subtle, flushed, "just-bitten" tint.',
    price: '$600',
    duration: '120 min',
    category: 'Microblading & Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1586773860418-d3b9a8ec817f?auto=format&fit=crop&q=80&w=800'
  },
  // Eyebrow Tinting
  {
    id: 'eyebrow-tinting-new',
    title: 'Eyebrow Tinting',
    description: 'Define and darken your brows with our professional tinting service. We use high-quality, semi-permanent dye to enhance the color and shape of your brows, making them appear fuller and more defined without the need for daily pencils or powders.',
    price: '$35.00',
    duration: '20-30 Mins',
    category: 'Eyebrow Tinting',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-tinting-new',
    title: 'Eyelash Tinting',
    description: 'Achieve the look of mascara without the daily application. Eyelash tinting darkens your natural lashes from root to tip, giving your eyes a bolder, more awake look that lasts for weeks. Perfect for active lifestyles and vacationing.',
    price: '$75.00',
    duration: '30 Mins',
    category: 'Eyebrow Tinting',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-lifting-new',
    title: 'Eyelash Lifting',
    description: 'The ultimate solution for naturally straight lashes. A lash lift curls your natural lashes from the base, creating a long-lasting lift and the illusion of extra length. It\'s like a permanent curl for your lashes that stays for up to 6-8 weeks.',
    price: '$120.00',
    duration: '45-60 Mins',
    category: 'Eyebrow Tinting',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-lifting-tinting-new',
    title: 'Eyelash Lifting + Tinting',
    description: 'The dream duo for your eyes. Combine a lash lift with a professional tint for maximum impact. Your lashes will be beautifully curled and deeply darkened, providing a dramatic yet natural \'mascara\' look every single day.',
    price: '$150.00',
    duration: '75 Mins',
    category: 'Eyebrow Tinting',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyebrow-lamination-new',
    title: 'Eyebrow Lamination',
    description: 'Achieve the trendy, fluffy brow look with eyebrow lamination. This treatment repositions your brow hairs to stay in a uniform, upward direction, making them appear fuller, thicker, and perfectly groomed. Ideal for hiding gaps and taming wild hairs.',
    price: '$105.00',
    duration: '45 Mins',
    category: 'Eyebrow Tinting',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  // Gentleman Services
  {
    id: 'the-regal-grooming-ritual',
    title: 'The Regal Grooming Ritual',
    description: 'Our signature service for the modern man. Includes a deep-cleansing facial designed for men\'s thicker skin, a precision brow cleanup (threading or waxing), and a soothing temple massage. Finish with high-performance hydration and sun protection.',
    price: '$65.00',
    duration: '45 Minutes',
    category: 'Gentleman Services',
    image: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'mens-anti-fatigue-facial',
    title: 'Men\'s Anti-Fatigue Facial',
    description: 'Specifically formulated to combat the effects of stress, lack of sleep, and environmental damage. This treatment uses oxygen-infused products and cooling stones to reduce puffiness, brighten dullness, and leave you looking refreshed and revitalized.',
    price: '$85.00',
    duration: '60 Minutes',
    category: 'Gentleman Services',
    image: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?auto=format&fit=crop&q=80&w=800'
  },
  // Threading
  {
    id: 'threading-eyebrow-new',
    title: 'Eyebrow Threading',
    description: 'This precision brow-sculpting treatment is designed to enhance your natural features through expert shaping and detailing. Using a gentle, chemical-free threading technique, each hair is removed from the root to create clean, defined arches with long-lasting results.',
    price: '$30.00',
    duration: '15 Minutes',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-upper-lip',
    title: 'Upper Lip Threading',
    description: 'A delicate yet effective treatment that removes unwanted hair from the upper lip area with precision and care.',
    price: '$15.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-chin',
    title: 'Chin Threading',
    description: 'Targeted hair removal designed to gently eliminate unwanted chin hair while maintaining skin integrity.',
    price: '$15.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-forehead',
    title: 'Forehead Threading',
    description: 'A refining treatment that removes fine hair from the forehead area to create a smoother, brighter appearance.',
    price: '$15.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-sideburn',
    title: 'Sideburn Threading (Both Sides)',
    description: 'This contouring service carefully removes sideburn hair to frame the face and enhance overall symmetry.',
    price: '$35.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-nose',
    title: 'Nose Threading',
    description: 'A detailed grooming treatment focused on removing visible hair around the nose area for a clean, refined look.',
    price: '$15.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-full-face',
    title: 'Full Face Threading',
    description: 'A complete facial rejuvenation treatment that removes unwanted hair from all areas of the face, including brows, upper lip, chin, forehead, and sideburns.',
    price: '$50.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'threading-full-face-neck',
    title: 'Full Face & Neck Threading',
    description: 'An all-inclusive treatment extending beyond the face to include the neck area for a truly seamless finish.',
    price: '$60.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-nose-threading-cat',
    title: 'Nose Waxing',
    description: 'A quick and effective treatment designed to remove unwanted nose hair from the root using professional waxing techniques.',
    price: '$25.00',
    category: 'Threading Services',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  // Eyelash Extensions
  {
    id: 'eyebrow-tinting-ext',
    title: 'Eyebrow Tinting',
    description: 'Enhance the depth, shape, and definition of your brows with this semi-permanent tinting treatment.',
    price: '$35.00',
    duration: '90-120 Mins',
    category: 'Eyelash Extensions',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-tinting-ext',
    title: 'Eyelash Tinting',
    description: 'This lash-enhancing treatment darkens your natural lashes from root to tip, creating the appearance of longer, thicker, and more defined lashes without mascara.',
    price: '$75.00',
    duration: '60 min',
    category: 'Eyelash Extensions',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-lifting-ext',
    title: 'Eyelash Lifting',
    description: 'A transformative treatment that lifts and curls your natural lashes from the base, creating the illusion of longer, fuller lashes.',
    price: '$120.00',
    duration: '60 - 90 Min',
    category: 'Eyelash Extensions',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyelash-lifting-tinting-ext',
    title: 'Eyelash Lifting & Tinting',
    description: 'A complete lash enhancement combining lift and tint for maximum impact.',
    price: '$150.00',
    category: 'Eyelash Extensions',
    image: 'https://images.unsplash.com/photo-1583001931046-f9e4043b438c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'eyebrow-lamination-ext',
    title: 'Eyebrow Lamination',
    description: 'This advanced brow-smoothing treatment restructures and sets each hair into place, creating a fuller, lifted, and perfectly groomed look.',
    price: '$105.00',
    duration: '60 Min',
    category: 'Eyelash Extensions',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  // Waxing
  {
    id: 'waxing-brazilian',
    title: 'Brazilian',
    description: 'Our most popular waxing service. Complete removal of hair from front to back. We use high-quality hard wax designed for sensitive areas.',
    price: '$120.00',
    duration: '30-45 Mins',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-full-face',
    title: 'Full Face',
    description: 'A full-face wax is a comprehensive, professional beauty service that removes unwanted, fine, and coarse hair from the entire face.',
    price: '$60.00',
    duration: '60 minutes',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-stomach',
    title: 'Stomach',
    description: 'A full stomach wax is a hair removal service that removes hair from the entire abdominal area.',
    price: '$40.00',
    duration: '60 min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-full-arms',
    title: 'Full Arms',
    description: 'Full arm waxing is a hair removal service that covers the entire arm from shoulder to wrist.',
    price: '$60.00',
    duration: '60 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-under-arms',
    title: 'Under Arms',
    description: 'Underarm waxing is a quick and effective hair removal method using hard wax to remove hair from the root.',
    price: '$30.00',
    duration: '60 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-full-arm-under-arm',
    title: 'Full Arm & Under Arm',
    description: 'Combined hair removal for arms and underarms for a smooth, seamless finish.',
    price: '$80.00',
    duration: '60 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-half-leg',
    title: 'Half Leg',
    description: 'A half leg wax is a budget-friendly hair removal service that removes hair from either the lower leg or upper leg.',
    price: '$60.00',
    duration: '30 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-full-leg-new',
    title: 'Full Leg',
    description: 'A full leg wax removes hair from the entire leg, from ankle to thigh, for long-lasting smoothness.',
    price: '$100.00',
    duration: '30 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-back',
    title: 'Back',
    description: 'Back waxing is a professional grooming service that removes hair from the root across the shoulders and back.',
    price: '$40.00',
    duration: '60 Min',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-bikini',
    title: 'Bikini',
    description: 'A bikini wax removes hair from the pubic area that sits outside the lines of a standard swimsuit.',
    price: '$65.00',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-neck',
    title: 'Neck – Front & Back',
    description: 'This treatment removes unwanted hair from the front and back of the neck for a clean, groomed appearance.',
    price: '$35.00',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-ear',
    title: 'Ear Waxing',
    description: 'A specialized service that removes unwanted hair from the outer ear area with precision and care.',
    price: '$25.00',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-nose',
    title: 'Nose Waxing',
    description: 'A quick and effective treatment designed to remove unwanted nose hair from the root using professional waxing techniques.',
    price: '$25.00',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'waxing-full-body',
    title: 'Full Body Waxing',
    description: 'Our most comprehensive waxing service, providing head-to-toe smoothness for ultimate confidence.',
    price: '$350.00',
    category: 'Waxing',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800'
  },
  // Beauty Products
  {
    id: 'royal-deep-cleanse-gel',
    title: 'Royal Deep Cleanse Gel',
    description: 'A powerful yet gentle cleanser that removes impurities and excess oil while maintaining the skin\'s natural balance.',
    price: '$45.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gentle-milk-cleanser',
    title: 'Gentle Milk Cleanser',
    description: 'Ideal for sensitive or dry skin, this creamy cleanser removes makeup and debris while soothing and hydrating.',
    price: '$42.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'vitamin-c-radiance-serum',
    title: 'Vitamin C Radiance Serum',
    description: 'A potent antioxidant serum that brightens the complexion, evens skin tone, and protects against environmental damage.',
    price: '$85.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'hyaluronic-hydration-boost',
    title: 'Hyaluronic Hydration Boost',
    description: 'A lightweight serum that delivers intense hydration, plumping the skin and reducing the appearance of fine lines.',
    price: '$78.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'peptide-restore-cream',
    title: 'Peptide Restore Cream',
    description: 'An advanced anti-aging moisturizer that stimulates collagen production and improves skin elasticity.',
    price: '$95.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'daily-defense-spf-50',
    title: 'Daily Defense SPF 50',
    description: 'A broad-spectrum sunscreen that protects against UVA and UVB rays while nourishing the skin with antioxidants.',
    price: '$48.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'silk-body-butter',
    title: 'Silk Body Butter',
    description: 'A rich, luxurious body cream that deeply moisturizes and softens the skin, leaving it feeling silky and smooth.',
    price: '$55.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gentlemans-post-shave-balm',
    title: 'Gentleman\'s Post-Shave Balm',
    description: 'A soothing balm designed to calm irritation and hydrate the skin after shaving.',
    price: '$38.00',
    category: 'Beauty Products',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  }
];

export const GIFT_PACKAGES: GiftPackage[] = [
  {
    id: 'therapeutic-massage-pkg',
    title: 'Therapeutic Massage Package',
    description: 'Buy 5, get 6 therapeutic 1-hour body massages. Crafted for those who value regular relaxation.',
    price: '$525.00',
    duration: '6 x 1 Hour Sessions',
    image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'premium-facial-pkg',
    title: 'Premium Facial Package',
    description: 'A set of 6 premium facials for the cost of 5. Designed for committed long-term skin care.',
    price: '$525.00',
    duration: '6 Sessions',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'serene-escapes',
    title: 'Serene Escapes',
    description: 'A magical retreat for ultimate relaxation. Guest enjoys a therapeutic massage and European Facial with hand treatment, finalized with our Signature Mani-Pedi. Includes a delightful lunch.',
    price: '$345.00',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'royal-indulgence',
    title: 'The Royal Indulgence',
    description: 'The pinnacle of opulence. Begins with our Signature Brown Sugar Scrub and full body massage, followed by a revitalizing European Facial with Enzyme Peel and mask. Complete with our luxe Spa Mani-Pedi and a catered lunch.',
    price: '$478.00',
    duration: 'Approx. 6 hours',
    image: 'https://images.unsplash.com/photo-1519415510236-85592ac75320?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'express-retreat',
    title: 'Express Retreat',
    description: 'Perfect for a midday refresh or evening prep. Select either a European-style facial or a 1-hour body massage, paired with a Signature Manicure.',
    price: '$147.00',
    duration: 'Approx. 2 hours',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
    extended: {
      title: 'Extended Retreat',
      description: 'Includes all \'Express Retreat\' services, plus a Signature Pedicure for a complete touch.',
      price: '$210.00',
      duration: 'Approx. 3 hours'
    }
  },
  {
    id: 'balance-glow',
    title: 'Balance & Glow',
    description: 'A quick getaway for body and soul, featuring a therapeutic 1-hour massage combined with a classic European facial.',
    price: '$210.00',
    duration: 'Approx. 2 1/4 hours',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'head-to-toe',
    title: 'Head-to-Toe Relief',
    description: 'Soothe tired muscles and feet alike. Enjoy a full-hour body massage accompanied by our rejuvenating signature pedicure.',
    price: '$168.00',
    duration: 'Approx. 2 hours',
    image: 'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'ladies-haven',
    title: 'Ladies\' Haven',
    description: 'Whisk her away to tranquility with a 1-hour body massage, European facial with hand care, and our conditioning Signature Manicure.',
    price: '$252.00',
    duration: 'Approx. 3 hours',
    image: 'https://images.unsplash.com/photo-1516238840914-94dfc0c873ae?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'mother-to-be',
    title: 'Mother-to-Be Bliss',
    description: 'A special package for the expectant mom! Includes a hormonal-balancing Prenatal Facial and a 60-minute Prenatal Massage. Finishes with an Organic Spa Pedicure with warm paraffin.',
    price: '$283.00',
    duration: 'Approx. 3 ½ hours',
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'mani-pedi-delight',
    title: 'Mani-Pedi Delight',
    description: 'A quick luxury for hands and toes. Features our Signature Manicure and Signature Pedicure.',
    price: '$105.00',
    duration: 'Approx. 1 1/2 hours',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gentlemans-break',
    title: 'Gentleman\'s Break',
    description: 'The perfect pause for the modern man. Includes a relaxing 1-hour stone massage and a European-style facial.',
    price: '$230.00',
    duration: 'Approx. 2 1/4 hours',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
  }
];

export const SPECIAL_OFFERS = {
  holidaySpecials: {
    title: 'Holiday Exclusive Specials',
    subtitle: 'Experience Royal Beauty Care',
    description: 'Celebrate the season with our curated holiday treats and exclusive savings.',
    treats: [
      'Decorative Vases & Luminaries',
      'Web Exclusive Offer',
      'Luxury Bath Essentials',
      'NuFACE Toning Device',
      'Mani-Pedi Essentials',
      'Scented Candles',
      'Cozy Warmies',
      'Royal Care Body Collection',
      'Perfect Stocking Fillers',
      'Jan Marini Skincare',
      'Image Skincare Collection',
      'Lip Treatment'
    ]
  },
  moisturizerOffer: {
    title: 'Save 20% on Moisturizers',
    discount: '20% Off',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
  },
  featuredSessions: [
    {
      id: 'cranberry-facial',
      title: 'Winter Cranberry Facial',
      description: 'A powerful blend of brightening cranberry oil and cooling peppermint to nourish, hydrate, and rejuvenate winter skin.',
      image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'holiday-gift-sets',
      title: 'Holiday Gift Sets',
      description: 'Ideal for birthdays, anniversaries, or any celebration. Give the gift of pure relaxation and beauty to someone special.',
      image: 'https://images.unsplash.com/photo-1549465220-1d8c9d9c6703?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'relaxation-massage',
      title: '1 Hour Relaxation Massage',
      description: 'Enjoy 60 minutes of blissful unwinding. Our refreshing massage designed to soothe your spirit and relax your body.',
      image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800'
    }
  ]
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Regular Client',
    content: 'The most relaxing experience I have ever had. My skin has never looked better after the Signature Hydrafacial.',
    rating: 5
  },
  {
    id: '2',
    name: 'Emily Davis',
    role: 'Bridal Client',
    content: 'They did an amazing job for my wedding prep. The staff is professional and the atmosphere is pure luxury.',
    rating: 5
  },
  {
    id: '3',
    name: 'Michelle Chen',
    role: 'Skincare Enthusiast',
    content: 'Finally found a place that understands my skin needs. The anti-aging treatment is worth every penny.',
    rating: 5
  }
];

export const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800'
];
