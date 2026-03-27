<?php

declare(strict_types=1);

/** Site content configuration for Royal Beauty Care. */

return [
    // Two lines each (\n)
    'hero_slides' => [
        "Precision Cuts — Women, Men &\nKids",
        "Professional Color — Root,\nHighlights & More",
        "Perms & Japanese Magic Straight —\nLasting Style",
        "Style & Finish — Blow Dry, Upstyle\n& Makeup",
    ],
    'hero_bg' => 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1920&auto=format&fit=crop',
    'story_img' => 'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=800&auto=format&fit=crop',
    'signature' => [
        'cut' => [
            'title' => 'Cut',
            'label' => 'Signature Service',
            'text' => 'Precision cuts for everyone. Our stylists deliver tailored cuts for women, men, and kids—clean lines, modern shapes, and a look that suits you.',
            'items' => ['Women $35+', 'Men $25+', 'Kids $25+'],
            'img' => 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop',
            'img_left' => false,
        ],
        'color' => [
            'title' => 'Color',
            'label' => 'Color',
            'text' => 'From root touch-ups to full highlights, we bring out your best with professional color. Root, manicure, and highlight services for a fresh, vibrant look.',
            'items' => ['Root $80+', 'Manicure $80+', 'Highlight (F) $200+', 'Highlight (M) $150+'],
            'img' => '/assets/signature-color.png',
            'img_left' => true,
        ],
        'perm' => [
            'title' => 'Perm',
            'label' => 'Perm',
            'text' => 'From men\'s iron perm to Japanese magic straight, we offer a range of perm and straightening services. Set/Digital and Magic Setting for lasting waves or sleek, smooth results.',
            'items' => ['Men\'s Iron Perm $130+', 'Basic Women\'s Perm $100+', 'Set / Digital $200+', 'Magic Setting $250+', 'Japanese Magic Straight $230+'],
            'img' => '/assets/signature-perm.png',
            'img_left' => false,
        ],
        'style' => [
            'title' => 'Style',
            'label' => 'Style',
            'text' => 'Shampoo, blow dry, upstyle, and makeup. Perfect for events, daily refresh, or a full glam look. Let us finish your look with care and precision.',
            'items' => ['Shampoo $20+', 'Blow Dry $35+', 'Upstyle $130+', 'Makeup $150+'],
            'img' => 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
            'img_left' => true,
        ],
    ],
    'service_menu' => [
        ['category' => 'CUT', 'items' => [['name' => 'Women', 'price' => '$35+'], ['name' => 'Men', 'price' => '$25+'], ['name' => 'Kids', 'price' => '$25+']]],
        ['category' => 'COLOR', 'items' => [['name' => 'Root', 'price' => '$80+'], ['name' => 'Manicure', 'price' => '$80+'], ['name' => 'Highlight (F)', 'price' => '$200+'], ['name' => 'Highlight (M)', 'price' => '$150+']]],
        ['category' => 'PERM', 'items' => [['name' => "Men's Iron Perm", 'price' => '$130+'], ['name' => "Basic Women's Perm", 'price' => '$100+'], ['name' => 'Set / Digital', 'price' => '$200+'], ['name' => 'Magic Setting', 'price' => '$250+'], ['name' => 'Japanese Magic Straight', 'price' => '$230+']]],
        ['category' => 'STYLE', 'items' => [['name' => 'Shampoo', 'price' => '$20+'], ['name' => 'Blow Dry', 'price' => '$35+'], ['name' => 'Upstyle', 'price' => '$130+'], ['name' => 'Makeup', 'price' => '$150+']]],
    ],
    'gallery' => [
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-1.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-2.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-3.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-4.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-5.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-6.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-7.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-8.png'],
        ['url' => 'https://www.instagram.com/', 'img' => '/assets/gallery/gallery-9.png'],
    ],
    'testimonials' => [
        [
            'name' => 'Jimmy Nguyen',
            'text' => 'This place is so amazing. I met with Miss Young, I think she\'s the owner there. I asked for a hair cut and for a short men\'s curly hair perm and she did absolutely amazing! The timing was way quicker than I expected but she was so friendly and suggested I try a down curl pattern and it definitely fits my appearance well! I asked for a fade and she did a great job on my fade too! I will definitely be coming back!',
        ],
        [
            'name' => 'Cathy Ngo',
            'text' => 'Wonderful service and a relaxing experience. The team is professional, attentive, and highly skilled.',
        ],
        [
            'name' => 'Aaborr Len',
            'text' => 'I had a great experience here! I got my hair trimmed, coloured, and a keratin treatment and I\'m so happy with the results. Young was lovely and very professional. Booking was easy, and when I had an inconvenience, she did her best to adjust the appointment and fit me in, which I really appreciated. Her pricing is also very reasonable for the quality she provides. Highly recommend!',
        ],
        [
            'name' => 'Y P',
            'text' => 'I stopped by Zion Market recently and was looking for a hair salon to get my husband\'s hair cut when we happened to walk past this place and decided to go in. I\'m so glad we did. The hair stylist cut my husband\'s hair quickly and beautifully. Because we were so happy with the result, I brought my daughter back for a haircut as well. She absolutely loves it. They are incredibly kind and professional, and their prices are amazing — $25 for men\'s cuts and $35 for women\'s cuts. I highly recommend this place!',
        ],
        [
            'name' => 'Justin Nguyen',
            'text' => 'Really amazing haircut! Been going to Kim for many years and she opened a new place! Every time I go, the quality is always consistent and you can see the confidence in her work. She really makes sure that the haircut is up to standard. On the plus side, it\'s great pricing for that level of quality! Definitely recommend!!',
        ],
        [
            'name' => 'Monica Nguyen',
            'text' => 'This is the hair salon to go to if you\'re in the area! Ask for Young and she will carefully take care of your haircut. She has been my hair stylist for 5+ years now, because I love the fact she takes the time to ask what I want and looks at all the references I have. I have never had a bad haircut with her when it comes to my long, thick hair. I will always come back to have her cut and wash my hair. The salon is very clean and spacious as well, so you can bring your family there too.',
        ],
    ],
    'instagram' => 'https://www.instagram.com/',
    'facebook' => 'https://www.facebook.com/',
    /** Tawk.to — embed + direct chat (keep in sync) */
    'tawk_property_id' => '69b675beb2bda41c36e81e18',
    'tawk_widget_id' => '1jjobnssh',
    'tawk_chat' => 'https://tawk.to/chat/69b675beb2bda41c36e81e18/',
    'location_name' => 'Royal Beauty Care',
    'address' => 'Denver, CO',
    'phone' => '+1 (000) 000-0000',
    'phone_tel' => '+10000000000',
    'contact_email' => 'contact@example.com',
    'hours' => [
        'Saturday: 10 AM – 7 PM',
        'Sunday: 1 – 6 PM',
        'Monday: Closed',
        'Tuesday: 10 AM – 7 PM',
        'Wednesday: 10 AM – 7 PM',
        'Thursday: 10 AM – 7 PM',
        'Friday: 10 AM – 7 PM',
    ],
    'map_embed' => 'https://www.google.com/maps?q=2405+S+Stemmons+Fwy+Ste+1126,+Lewisville,+TX+75067&output=embed',
    'map_search' => 'https://www.google.com/maps/search/2405+S+Stemmons+Fwy+Ste+1126+Lewisville+TX+75067',
];
