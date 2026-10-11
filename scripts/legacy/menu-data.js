/* MOBA menu, August 2026 (source: "Moba menu dump Aug 2026.pdf").
   All prices in INR, taxes extra.

   diet:   "veg" | "nonveg" | "egg" | "both" (veg or non-veg depending on the filling you pick)
           | null (not marked on the printed menu yet: ask the kitchen, then fill in)
   spice:  0 none listed · 1 mild · 2 hot · 3 very hot
   sizes:  [{ label, price }]  the first size is the default
   choose: [{ label, options: [], max }]  picked when ordering, does not change the price.
           One pick by default; max: 2 lets the diner pick up to two (double scoop).
   extras: a section's add-ons, offered as checkboxes on every dish in that section
   badge:  short sticker text; dishes with a badge are shown in "Most loved"
   image:  null for line art, or "assets/dishes/<file>.webp" once real photos are shot  */
/* Where placed orders are POSTed as JSON (see sendOrder in menu.js for the shape).
   Leave it empty until the kitchen system exists: orders are then kept on the diner's
   phone and the confirmation tells them to show it to the waiter. */
window.MOBA_ORDER_URL = "";

window.MOBA_MENU = (() => {
  const FILL4 = ["Tofu", "Paneer", "Chicken", "Fish"];
  const FILL3 = ["Tofu", "Paneer", "Chicken"];
  const filling = (options = FILL4) => ({ label: "Filling", options });
  const FLAVOURS = ["Gochuchang", "Smoky Gochu", "Topokki", "Sweet Chilli", "Bulgogi", "Peri Peri Dusting", "Buldak (extra hot)"];

  const categories = [
    {
      id: "signatures", name: "Moba Signatures", short: "Signatures", ko: "모바 시그니처", art: "pot",
      blurb: "Our two most-loved plates. Rabokki is ramyeon and tteokbokki simmered together in one pan, and the dish our kitchen is proudest of.",
      notes: [
        { title: "Ramyeon + tteokbokki = rabokki", ko: "라볶이", text: "Can’t choose between noodles and rice cakes? You don’t have to. Rabokki is Korea’s original ban-ban, half and half, simmered together in one sauce so every forkful gives you the slurp of ramyeon and the chew of tteok." },
      ],
      extras: ["fried-egg", "kimchi", "ramyeon-egg", "extra-meat"],
    },
    {
      id: "starters", name: "Korean Starters", short: "Starters", ko: "한국식 스타터", art: "wok",
      blurb: "Crisp bites tossed to order in bold Korean sauces and finished with fresh veggies, the way Seoul does street food. Pick your base and we build the dish around it.",
      notes: [
        { title: "Choose your base", ko: "베이스 선택", text: "Cauliflower, potato or mushroom keeps a dish vegetarian. Chicken or meat makes it non-veg. Prawn dishes are served as they are." },
        { title: "Ban-ban, half & half", ko: "반반", text: "Can’t decide? Order any large starter as Ban-Ban for ₹149 extra and take two flavours in one plate. You can even pair a veg base with a non-veg one." },
      ],
      extras: ["banban"],
    },
    {
      id: "crispy", name: "Korean Crispy Bites", short: "Crispy Bites", ko: "바삭바삭", art: "chicken",
      blurb: "Fried fresh, sauced to order. Pick a size, then pick any flavour.",
      notes: [
        {
          title: "Flavour options", ko: "소스 선택", text: "",
          items: [
            ["Gochuchang", "Authentic Korean chilli sauce with a bold and spicy kick and rich umami depth."],
            ["Smoky Gochu", "Bold Korean chilli sauce with smoky notes, balanced heat, and rich umami flavour."],
            ["Topokki", "Fiery blend of gochujang, garlic, and savoury seasonings with a hint of sweetness."],
            ["Sweet Chilli", "The perfect balance of sweetness and mild heat, finished with a delicious tangy kick."],
            ["Bulgogi", "A classic Korean BBQ sauce with a perfect balance of sweetness, soy, garlic, and sesame."],
            ["Peri Peri Dusting", "Zesty, smoky, and mildly spicy seasoning that adds a bold kick to every crispy bite."],
            ["Buldak, extra hot", "Fiery Korean chilli sauce packed with smoky heat, bold flavour, and addictive spice. Not for the faint-hearted!"],
            ["Ban-ban (half n half)", "Choose any two flavours. Available on large orders only."],
          ],
        },
        { title: "Make a meal", ko: "세트 메뉴", text: "Turn any plate into a full meal: add any one of fries, cold coffee, lemonade or lemon ice tea at ₹99." },
      ],
      extras: ["meal-fries", "meal-coffee", "meal-lemonade", "meal-icetea"],
    },
    {
      id: "street", name: "Street Snacks", short: "Street Snacks", ko: "길거리 간식", art: "corndog",
      blurb: "Corn doggs, K-nachos and the snacks you reach for between bowls, all tossed in house sauces.",
      groups: [
        ["corndog", "K-Corn Dogg", "콘도그"],
        ["nachos", "K-Nachos", "나초"],
        ["bites", "K-Street Bites", "스트리트 간식"],
      ],
    },
    {
      id: "mandu", name: "Korean Mandu", short: "Mandu", ko: "만두", art: "dimsum",
      blurb: "Hand-folded and steamed to order, then served your way. Five fillings, from garden-fresh vegetables to crystal-skin prawns.",
      notes: [
        { title: "Choose how it’s served", ko: "플레이팅 선택", text: "",
          items: [
            ["Saucy plate", "Perfectly steamed mandus plated over a velvety gochujang sauce with sautéed vegetables."],
            ["Broth bowl", "Steamed mandus served in a warming Korean broth infused with gochujang and vegetables."],
          ],
        },
      ],
    },
    {
      id: "salads", name: "Salads & Soups", short: "Salads & Soups", ko: "샐러드 · 국물", art: "soup",
      blurb: "Fresh, light, comforting. Every salad and soup is made to order with your pick of chicken, fish, paneer or tofu.",
      groups: [
        ["salads", "Korean Salads", "샐러드"],
        ["soups", "Korean Soups", "국물 요리"],
      ],
      notes: [
        { title: "Good to know", ko: "안내", text: "Salads are dressed to order, so they’re best eaten fresh. Soups are served hot in a shareable bowl. Ask for an extra bowl and we’ll split it for you. Paneer and tofu keep the dish fully vegetarian." },
      ],
    },
    {
      id: "gimbap", name: "Gimbap & Toppoki", short: "Gimbap", ko: "김밥 · 떡볶이", art: "gimbap",
      blurb: "Rolled and simmered to order. Every gimbap and toppoki comes with your choice of tofu, paneer, chicken or fish.",
      groups: [
        ["gimbap", "Gimbap", "김밥"],
        ["toppoki", "Toppoki", "떡볶이"],
      ],
      extras: ["fried-egg", "extra-meat", "kimchi", "extra-cheese"],
    },
    {
      id: "rameyon", name: "Rameyon", short: "Rameyon", ko: "라면", art: "noodles",
      blurb: "Korean ramyeon built on a rich broth and springy noodles, finished with fresh vegetables and the filling you pick. Every bowl ₹339.",
      notes: [
        { title: "Spice guide", ko: "맵기 단계", text: "Heat can be dialled up or down on any bowl. Just tell us when you order. Buldak is our hottest; approach with respect." },
        { title: "Choose your filling", ko: "토핑 선택", text: "Every rameyon comes with one filling of your choice at no extra cost. Tofu and paneer keep the bowl vegetarian." },
      ],
      extras: ["fried-egg", "kimchi", "ramyeon-egg", "extra-meat"],
    },
    {
      id: "ricenoodle", name: "K-Rice & Noodle", short: "Rice & Noodle", ko: "밥 · 면", art: "rice",
      blurb: "One menu, your way. Pick rice (steamed and tossed) or noodles (wok-tossed), at the same price, then a flavour and a filling.",
      notes: [
        { title: "Choose your filling", ko: "토핑", text: "One filling comes with every bowl at no extra cost. Tofu and paneer keep it vegetarian; chicken and fish make it non-veg." },
        { title: "Make a meal", ko: "세트 메뉴", text: "Optional: add fries, cold coffee, lemonade or lemon ice tea at ₹99." },
      ],
      extras: ["meal-fries", "meal-coffee", "meal-lemonade", "meal-icetea"],
    },
    {
      id: "toast", name: "Toast, Melts & Burgers", short: "Toast & Burgers", ko: "토스트 · 버거", art: "burger",
      blurb: "Korean flavours on continental classics. Pressed hot in our panini grill, then finished with gochujang, bulgogi, kimchi and buldak.",
      groups: [
        ["toast", "Toast & Sandwiches", "토스트 · 샌드위치"],
        ["burgers", "K-Burgers", "케이 버거"],
      ],
      notes: [
        { title: "Made on panini bread", ko: "파니니", text: "Every toast and sandwich is built on panini bread and pressed hot to order: crisp ridged crust outside, melting centre inside. Never sourdough, never plain sliced bread." },
      ],
      extras: ["kimchi", "fried-egg", "extra-meat", "extra-cheese", "meal-fries", "meal-coffee", "meal-lemonade", "meal-icetea"],
    },
    {
      id: "boba", name: "Boba Bar", short: "Boba Bar", ko: "보바 · 버블티", art: "boba",
      blurb: "Shaken to order, 39 ways to sip. Freshly brewed tea, fresh espresso, high-grade matcha and ube, real fruit and never syrup.",
      groups: [
        ["authentic", "Authentic", "오리지널", "Where boba began. Freshly brewed tea folded into creamy milk, then loaded with warm, chewy tapioca pearls."],
        ["matcha", "Matcha", "말차", "High-grade matcha, whisked fresh so it stays vivid and grassy rather than bitter. Earthy, smooth and never dusty."],
        ["ube", "Ube", "우베", "High-grade purple yam, naturally sweet and nutty with that unmistakable violet colour. Our most photographed cup."],
        ["chocolate", "Chocolate", "초콜릿", "Deep, proper cocoa, not powder and sugar. Rich enough to drink slowly, sweet enough to count as pudding."],
        ["coffee", "Coffee", "커피", "Freshly pulled espresso over ice, balanced with milk and pearls. The pick-me-up that chews back."],
        ["coconut", "Tender Coconut", "코코넛", "Fresh tender coconut water and flesh, blended cold. Light, hydrating and quietly the most refreshing thing we make."],
        ["fruit", "Fresh Fruit", "생과일", "Real fruit, blended to order, never a syrup or a concentrate. What is in season is what tastes best."],
        ["banana", "Banana", "바나나", "Ripe bananas blended fresh for that thick, milkshake-soft body. Korea’s café favourite, four ways."],
        ["lemonade", "Lemonade & Iced Tea", "레모네이드", "Freshly brewed tea and real citrus over ice, the lightest way to drink boba. Sparkling options fizz."],
      ],
      notes: [
        { title: "More boba? Always say yes.", ko: "토핑 추가", text: "Every cup comes with a generous scoop of pearls, but the regulars never stop at one. Feeling brave? Add coconut jelly too, and a scoop of ice cream on top." },
      ],
      extras: ["extra-boba", "coconut-jelly", "ice-cream"],
    },
    {
      id: "desserts", name: "K-Desserts", short: "Desserts", ko: "디저트", art: "sundae",
      blurb: "Sweet finishes, Korean style. Sundaes and hwachae are built to share. Ask for extra spoons and we’ll bring them.",
      groups: [
        ["cakes", "Cakes & Bakes", "케이크"],
        ["sundaes", "Sundaes", "선데이"],
        ["hwachae", "Hwachae", "화채"],
        ["icecream", "Ice Cream", "아이스크림"],
      ],
    },
  ];

  // Add-ons and "make a meal" sides: shared across sections, one entry each in the list.
  const extras = [
    { id: "fried-egg", name: "Fried egg", price: 25, diet: "egg" },
    { id: "kimchi", name: "Kimchi on the side", price: 40, diet: "veg" },
    { id: "ramyeon-egg", name: "Extra rameyon egg", price: 25, diet: "egg" },
    { id: "extra-meat", name: "Extra meat / veg", price: 50, diet: "both" },
    { id: "extra-cheese", name: "Extra cheese", price: 25, diet: "veg" },
    { id: "banban", name: "Ban-ban, half & half (large only)", price: 149, diet: "both" },
    { id: "meal-fries", name: "Meal: crispy fries (salted / peri peri)", price: 99, diet: "veg" },
    { id: "meal-coffee", name: "Meal: classic cold coffee", price: 99, diet: "veg" },
    { id: "meal-lemonade", name: "Meal: classic lemonade", price: 99, diet: "veg" },
    { id: "meal-icetea", name: "Meal: lemon ice tea", price: 99, diet: "veg" },
    { id: "extra-boba", name: "Extra boba", price: 30, diet: "veg", badge: "most loved" },
    { id: "coconut-jelly", name: "Coconut jelly", price: 30, diet: "veg" },
    { id: "ice-cream", name: "Ice cream scoop", price: 59, diet: "veg" },
  ];

  const D = (category, id, name, price, diet, description, more = {}) => ({ category, id, name, price, diet, description, spice: 0, image: null, ...more });

  const dishes = [
    // ── Moba Signatures ──
    D("signatures", "classic-rabokki", "Classic Rabokki", 369, "both", "Spicy gochujang-tossed ramen and tteokbokki with bok choy, shiitake mushrooms, and fresh veggies.", { spice: 2, choose: [filling()], badge: "signature" }),
    D("signatures", "creamy-rabokki", "Creamy Rabokki", 369, "both", "Spicy gochujang ramen and tteokbokki finished with cream, bok choy, shiitake mushrooms, and fresh veggies.", { spice: 1, choose: [filling()], badge: "signature" }),
    D("signatures", "bulgogi-rabokki", "Bulgogi Rabokki", 369, "both", "Chewy tteokbokki and ramen in a rich bulgogi sauce with veggies for a sweet-savoury Korean comfort bite.", { spice: 1, choose: [filling()], badge: "signature" }),
    D("signatures", "buldak-rabokki", "Flamey Buldak Rabokki", 369, "both", "Spicy buldak-tossed ramen and tteokbokki with bok choy, shiitake mushrooms, and fresh veggies.", { spice: 3, choose: [filling()], badge: "signature" }),
    D("signatures", "cream-cheese-bun", "Korean Cream Cheese Bun", 279, "egg", "Soft, pillowy bun filled with sweet-savoury cream cheese and finished with Korean-style sauces, baked in six pull-apart petals so it tears open into a long, slow cheese pull.", { badge: "signature", note: "Baked with egg in the dough, so it is not suitable for vegetarians who avoid egg. Best eaten warm, straight from the oven, torn petal by petal: the cool cream cheese is the perfect answer to gochujang heat." }),

    // ── Korean Starters ──
    D("starters", "fiery-seoul-gochujang", "Fiery Seoul Gochujang", 289, "both", "Crispy chicken tossed in a bold, spicy gochujang sauce, finished with fresh veggies for an authentic Seoul street-food kick.", { spice: 2, choose: [{ label: "Base", options: ["Cauliflower", "Chicken", "Meat"] }] }),
    D("starters", "smoky-seoul-gochujang", "Smoky Seoul Gochujang", 289, "both", "Crispy chicken tossed in a smoky and spicy gochujang sauce, finished with fresh veggies for an authentic Seoul street-food kick.", { spice: 2, choose: [{ label: "Base", options: ["Cauliflower", "Chicken", "Meat"] }] }),
    D("starters", "flamey-buldak", "Flamey Buldak", 289, "both", "Crispy bites tossed in a sweet-savoury bulgogi glaze, finished with fresh veggies for a classic Seoul street-style flavour.", { spice: 3, choose: [{ label: "Base", options: ["Mushroom", "Chicken", "Meat"] }] }),
    D("starters", "seoul-bulgogi-toss", "Seoul Bulgogi Toss", 289, "both", "Crispy chicken or potato tossed in a sticky honey-garlic glaze for a perfect sweet-savoury bite.", { spice: 1, choose: [{ label: "Base", options: ["Potato", "Chicken", "Meat"] }] }),
    D("starters", "gangnam-honey-chilli", "Gangnam Honey Chilli Garlic", 289, "both", "Crispy chicken or potato tossed in a sticky honey-garlic glaze for a perfect sweet-savoury bite.", { spice: 1, choose: [{ label: "Base", options: ["Chicken", "Potato"] }] }),
    D("starters", "butter-garlic-prawns", "Butter Garlic Prawns", 339, "nonveg", "Juicy prawns tossed in rich butter and garlic for a bold, flavour-packed starter.", { spice: 1 }),
    D("starters", "tempura-prawns", "Crispy Tempura Prawns", 339, "nonveg", "Light, crispy battered prawns fried to golden perfection for a delicate crunch.", { spice: 1 }),

    // ── Korean Crispy Bites ──
    D("crispy", "kfc-wings", "Korean Fried Chicken Wings", 229, "nonveg", "Korean fried chicken wings, fried fresh and sauced to order in any of our eight flavours.", { sizes: [{ label: "Small · 4 pcs", price: 229 }, { label: "Large · 6 pcs", price: 289 }], choose: [{ label: "Flavour", options: FLAVOURS }] }),
    D("crispy", "kfc-strips", "Korean Fried Chicken Strips", 229, "nonveg", "Boneless Korean fried chicken strips, fried fresh and sauced to order in any of our eight flavours.", { sizes: [{ label: "Small · 4 pcs", price: 229 }, { label: "Large · 6 pcs", price: 289 }], choose: [{ label: "Flavour", options: FLAVOURS }] }),
    D("crispy", "fried-tofu", "Korean Fried Tofu", 229, "veg", "Crispy tofu, fried fresh and sauced to order in any of our eight flavours.", { sizes: [{ label: "Small", price: 229 }, { label: "Large", price: 289 }], choose: [{ label: "Flavour", options: FLAVOURS }] }),
    D("crispy", "fried-cauliflower", "Korean Fried Cauliflower", 229, "veg", "Crispy florets, fried fresh and sauced to order in any of our eight flavours.", { sizes: [{ label: "Small", price: 229 }, { label: "Large", price: 289 }], choose: [{ label: "Flavour", options: FLAVOURS }] }),

    // ── Street Snacks ──
    D("street", "mozzarella-corndogg", "Mozzarella Cheese Corn Dogg", 289, "veg", "Crispy battered corn dog stuffed with gooey mozzarella cheese for a classic Korean street snack.", { group: "corndog" }),
    D("street", "ramyeon-corndogg", "Ramyeon Corn Dogg", 289, "both", "Crispy battered corn dog coated with crunchy ramyeon noodles.", { group: "corndog", choose: [{ label: "Filling", options: ["Veg", "Chicken"] }] }),
    D("street", "chicken-corndogg", "Chicken Corn Dogg", 289, "nonveg", "Crispy battered corn dog stuffed with juicy chicken for a hearty Korean-style bite.", { group: "corndog" }),
    D("street", "chicken-cheese-corndogg", "Chicken & Cheese Corn Dogg", 289, "nonveg", "Crispy battered corn dog stuffed with a 50:50 mix of chicken and cheese, savoury and gooey.", { group: "corndog" }),
    D("street", "fiery-nachos", "Fiery Korean Nachos", 289, "both", "Crispy nachos topped with gochujang, cheese sauce, kimchi salsa, spring onions, and spicy mayo.", { group: "nachos", choose: [filling(FILL3)] }),
    D("street", "seoul-street-nachos", "Seoul Street Nachos", 289, "both", "A MOBA signature loaded with Korean fried topping, kimchi, corn, cheese sauce, spicy mayo, and spring onions.", { group: "nachos", choose: [filling(FILL3)], badge: "signature" }),
    D("street", "bulgogi-nachos", "Bulgogi Nachos", 289, "both", "Crispy nachos topped with bulgogi sauce, kimchi, corn, cheese sauce, spicy mayo, and spring onions.", { group: "nachos", choose: [filling(FILL3)] }),
    D("street", "crispy-fries", "Crispy Fries", 189, "veg", "Golden crispy fries tossed with your choice of classic salt or peri peri seasoning.", { group: "bites", choose: [{ label: "Seasoning", options: ["Salted", "Peri Peri"] }] }),
    D("street", "korean-fries", "Korean Fries", 219, "veg", "Crispy fries drizzled with three signature Korean sauces for a bold, flavour-packed twist.", { group: "bites" }),
    D("street", "loaded-fries", "Korean Loaded Fries", 259, "both", "Crispy fries loaded with Korean sauces and crunchy fried chicken for the ultimate street-style bite.", { group: "bites", choose: [{ label: "Topping", options: ["Chicken", "Tofu"] }] }),
    D("street", "spring-rolls", "K-Spring Rolls", 189, "both", "Crispy golden rolls stuffed with seasoned vegetables, tossed with three in-house signature sauces.", { group: "bites" }),
    D("street", "cheese-balls", "K-Pop Cheese Balls", 189, "veg", "Crispy golden cheese balls stuffed with gooey cheese, fried to perfection, and tossed with house sauces.", { group: "bites" }),

    // ── Korean Mandu ──
    D("mandu", "classic-veg-mandu", "Classic Veg Mandu", 289, "veg", "Steamed dumplings filled with a flavourful mix of fresh vegetables.", { choose: [{ label: "Served as", options: ["Saucy plate", "Broth bowl"] }] }),
    D("mandu", "cheezy-veg-mandu", "Cheezy Spicy Veg Mandu", 289, "veg", "Vegetable-filled dumplings with melted cheese and a spicy Korean kick.", { choose: [{ label: "Served as", options: ["Saucy plate", "Broth bowl"] }] }),
    D("mandu", "spicy-chicken-mandu", "Spicy Chicken Mandu", 289, "nonveg", "Juicy chicken dumplings seasoned with bold Korean spices.", { choose: [{ label: "Served as", options: ["Saucy plate", "Broth bowl"] }] }),
    D("mandu", "cheese-chicken-mandu", "Cheese & Chicken Mandu", 289, "nonveg", "Tender chicken and gooey cheese wrapped in a delicate dumpling skin.", { choose: [{ label: "Served as", options: ["Saucy plate", "Broth bowl"] }] }),
    D("mandu", "prawn-hargao", "Prawn Hargao Mandu", 369, "nonveg", "Steamed crystal dumplings packed with succulent prawns and subtle seasonings.", { choose: [{ label: "Served as", options: ["Saucy plate", "Broth bowl"] }] }),

    // ── Salads & Soups ──
    D("salads", "sangchu-geotjeori", "Sangchu Geotjeori", 289, "both", "Fresh Korean lettuce salad tossed in a spicy, tangy sesame dressing with garlic and chili.", { group: "salads", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),
    D("salads", "korean-japchae", "Korean Japchae", 299, "both", "Stir-fried sweet potato glass noodles with fresh vegetables in a savoury Korean soy sauce glaze.", { group: "salads", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),
    D("salads", "bokchoy-geotjeori", "Bok Choy Geotjeori", 289, "both", "Crisp bok choy kimchi-style salad seasoned with Korean chili, garlic, sesame, and a refreshing tang.", { group: "salads", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),
    D("salads", "lemongrass-soup", "Lemongrass Soup", 189, "both", "Light Korean-style soup infused with fresh lemongrass and coriander for a clean, aromatic finish.", { group: "soups", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),
    D("salads", "broccoli-soup", "Creamy Broccoli Soup", 199, "both", "A velvety blend of broccoli and cream, drizzled with chilli oil and finished with toasted pine nuts.", { group: "soups", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),
    D("salads", "gochu-coconut-guk", "Spicy Gochu Coconut Guk", 199, "both", "Korean-style soup made with coconut milk, gochujang, and spices for a rich, spicy, and comforting bowl.", { group: "soups", choose: [filling(["Chicken", "Fish", "Paneer", "Tofu"])] }),

    // ── Gimbap & Toppoki ──
    D("gimbap", "fiery-gimbap", "Fiery Gochujang Gimbap", 339, "both", "Seaweed rice roll packed with fresh vegetables and your choice of filling, finished with a bold, sweet-spicy gochujang kick.", { group: "gimbap", choose: [filling()] }),
    D("gimbap", "kcrunch-gimbap", "K-Crunch Gimbap", 339, "both", "A crunchy Korean-style gimbap loaded with crispy tofu or chicken, fresh veggies, and a creamy spicy mayo drizzle.", { group: "gimbap", choose: [filling(["Tofu", "Chicken"])] }),
    D("gimbap", "buldak-cheese-gimbap", "Buldak Cheese Gimbap", 339, "both", "A fiery favourite: your choice of filling, melty cheese, and signature buldak sauce in seasoned rice and seaweed.", { group: "gimbap", choose: [filling()] }),
    D("gimbap", "kimchi-gimbap", "Kimchi Gimbap", 339, "both", "Tangy kimchi, crisp vegetables, and your choice of protein: the perfect balance of spice and crunch.", { group: "gimbap", choose: [filling()] }),
    D("gimbap", "seoul-street-gimbap", "Seoul Street Gimbap", 339, "both", "Inspired by Seoul’s street food: egg, fresh vegetables, cheese, and signature Korean sauces in every bite.", { group: "gimbap", choose: [filling()] }),
    D("gimbap", "classic-toppoki", "Classic Toppoki", 289, "both", "Soft Korean rice cakes simmered in a rich, savoury-spicy Korean sauce with your choice of filling.", { group: "toppoki", choose: [filling()] }),
    D("gimbap", "creamy-toppoki", "Creamy Toppoki", 289, "both", "Chewy rice cakes tossed in a smooth, creamy Korean sauce with your choice of filling.", { group: "toppoki", choose: [filling()] }),
    D("gimbap", "bulgogi-toppoki", "Bulgogi Toppoki", 289, "both", "Korean rice cakes coated in a sweet-savoury bulgogi glaze with your choice of filling.", { group: "toppoki", choose: [filling()] }),
    D("gimbap", "buldak-toppoki", "Buldak Toppoki", 289, "both", "Fiery rice cakes loaded with bold buldak flavours and your choice of filling.", { group: "toppoki", choose: [filling()] }),
    D("gimbap", "cheezy-toppoki", "Cheezy Toppoki", 319, "both", "Classic Korean rice cakes smothered in melted cheese and savoury Korean sauce.", { group: "toppoki", choose: [filling()] }),

    // ── Rameyon ──
    D("rameyon", "fiery-rameyon", "Fiery Gochuchang", 339, "both", "A bold and spicy ramen loaded with the rich heat of Korean gochujang.", { spice: 2, choose: [filling()] }),
    D("rameyon", "creamy-rameyon", "Creamy Gochuchang", 339, "both", "The perfect blend of creamy richness and sweet-spicy gochujang flavours.", { spice: 2, choose: [filling()] }),
    D("rameyon", "smoky-rameyon", "Smoky Gochuchang", 339, "both", "A deep, smoky ramen with a lingering gochujang kick.", { spice: 2, choose: [filling()] }),
    D("rameyon", "ssamjang-rameyon", "Ssamjang Bean", 339, "both", "A savoury and nutty ramen infused with Korea’s iconic ssamjang bean paste.", { spice: 1, choose: [filling()] }),
    D("rameyon", "buldak-rameyon", "Buldak", 339, "both", "Fiery Korean fire noodle flavours for those who love serious heat.", { spice: 3, choose: [filling()] }),
    D("rameyon", "bulgogi-rameyon", "Bulgogi", 339, "both", "A comforting bowl featuring sweet-savoury bulgogi-inspired flavours.", { spice: 1, choose: [filling()] }),
    D("rameyon", "kimchi-rameyon", "Kimchi", 339, "both", "A tangy, spicy ramen packed with the bold taste of fermented kimchi.", { spice: 1, choose: [filling()] }),

    // ── K-Rice & Noodle ──
    D("ricenoodle", "k-spicy", "K-Spicy", 269, "both", "Tossed in spicy gochujang sauce with exotic veggies for a bold Korean-style bite.", { spice: 2, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),
    D("ricenoodle", "buldak-toss", "Buldak Toss", 269, "both", "Tossed in fiery buldak sauce with veggies, for serious spice lovers.", { spice: 3, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),
    D("ricenoodle", "bulgogi-bowl", "Bulgogi", 269, "both", "Tossed in sweet-savoury bulgogi sauce with veggies for a comforting Korean classic.", { spice: 1, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),
    D("ricenoodle", "burnt-garlic", "Burnt Garlic", 269, "both", "Aromatic, tossed with crispy burnt garlic and savoury seasonings for a bold, comforting bite.", { spice: 1, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),
    D("ricenoodle", "kimchi-bowl", "Kimchi Bowl", 309, "both", "Tossed in spicy gochujang and fermented kimchi with exotic veggies for a bold Korean-style bite.", { spice: 2, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),
    D("ricenoodle", "k-cheezy-bowl", "K-Cheezy Bowl", 319, "both", "Tossed in spicy gochujang and grated cheese with exotic veggies for a bold Korean-style bite.", { spice: 1, choose: [{ label: "Base", options: ["Rice", "Noodles"] }, filling()] }),

    // ── Toast, Melts & Burgers ──
    D("toast", "seoul-street-toast", "Seoul Street Toast", 289, "both", "Grilled panini with fiery gochujang, vibrant peppers, melted cheese, and your choice of meat or veg.", { group: "toast", spice: 2, choose: [filling()] }),
    D("toast", "gochu-chicken-cheese", "Gochu Chicken Cheese", 289, "both", "Golden fried chicken glazed in spicy gochujang, finished with house gochu mayo and mozzarella.", { group: "toast", spice: 2, choose: [filling()] }),
    D("toast", "bulgogi-cheese-melt", "Bulgogi Cheese Melt", 289, "both", "Pressed panini with chicken or paneer glazed in house bulgogi sauce, finished with vibrant vegetables and melted cheese.", { group: "toast", spice: 1, choose: [filling()] }),
    D("toast", "k-kimchy-grilled", "K-Kimchy Grilled", 329, "both", "Pressed panini with fermented kimchi, chicken or paneer glazed in house bulgogi sauce, finished with vibrant vegetables.", { group: "toast", spice: 1, choose: [filling()] }),
    D("toast", "buldak-cheese", "Buldak Cheese", 289, "both", "Tender chicken or paneer tossed in flaming buldak sauce, layered with vibrant vegetables. Strictly for spice lovers.", { group: "toast", spice: 3, choose: [filling()] }),
    D("toast", "grilled-chicken-burger", "Korean Grilled Chicken Burger", 289, "nonveg", "Juicy flame-grilled chicken layered in a soft bun with Korean-style sauces and fresh veggies.", { group: "burgers" }),
    D("toast", "fried-chicken-burger", "Korean Fried Chicken Burger", 289, "nonveg", "Crispy fried chicken loaded into a soft bun with Korean-style sauces and fresh veggies.", { group: "burgers" }),
    D("toast", "grilled-paneer-burger", "Korean Grilled Paneer Burger", 289, "veg", "Char-grilled paneer layered in a soft bun with Korean-style sauces and fresh veggies.", { group: "burgers" }),
    D("toast", "fried-paneer-burger", "Korean Fried Paneer Burger", 289, "veg", "Crispy fried paneer loaded into a soft bun with Korean-style sauces and fresh veggies.", { group: "burgers" }),
  ];

  // ── Boba Bar: one line per cup; the group text describes the family ──
  const boba = {
    authentic: [["Signature Thai Milk Tea", 199], ["Earl Grey Milk Tea", 199], ["Creamy Taro", 219], ["Taro Cream Cheese", 249]],
    matcha: [["Matcha Milk Tea", 239], ["Mango Matcha", 249], ["Strawberry Matcha", 249], ["Dirty Matcha", 249]],
    ube: [["Ube", 309], ["Ube Matcha", 329], ["Ube Cloud", 339]],
    chocolate: [["Cocoalicious", 209], ["Choco Hazelnut", 219], ["Choco Strawberry", 229], ["Lotus Biscoff", 249], ["Choco Brownie", 249]],
    coffee: [["Classic Coffee Boba", 229], ["Classic Mocha", 229], ["Hazelnut Coffee Boba", 239]],
    coconut: [["Coco Matcha", 239], ["Coco Cloud Matcha", 259], ["Coco Cano Matcha", 239], ["Tender Coco Boba", 259]],
    fruit: [["Alphonso Mango", 219], ["Creamy Strawberry", 229], ["Creamy Blueberry", 249]],
    banana: [["Creamy Korean Banana", 229], ["Banana Iced Coffee", 239], ["Banana Milk Tea", 229], ["Choco Banana", 249]],
    lemonade: [["Lemon Ice Tea", 139], ["Earl Grey Ice Tea", 159], ["Passion Fruit", 169], ["Mango Passion Fruit", 169], ["Juicy Mango Splash", 169], ["Passion Fruit Ice Tea", 189], ["Sparkling Strawberry", 189], ["Sparkling Blueberry", 189], ["Sparkling Mango", 189]],
  };
  const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const [group, cups] of Object.entries(boba)) {
    for (const [name, price] of cups) {
      dishes.push(D("boba", `boba-${slug(name)}`, name, price, "veg", "", { group, badge: name === "Ube" ? "most photographed" : undefined }));
    }
  }

  // ── K-Desserts (not diet-marked on the printed menu: cakes and bakes stay unmarked until the kitchen confirms) ──
  dishes.push(
    D("desserts", "puddle-cake", "Puddle Cake", 289, null, "A rich, molten-centred cake served warm.", { group: "cakes", choose: [{ label: "Flavour", options: ["Chocolate", "Choco Hazelnut", "White Chocolate", "Triple Chocolate"] }] }),
    D("desserts", "cheese-cake", "Cheese Cake", 289, null, "Creamy, smooth cheesecake.", { group: "cakes", choose: [{ label: "Flavour", options: ["Blueberry", "Strawberry", "Mango", "Classic Plain"] }] }),
    D("desserts", "brownie", "Brownie", 89, null, "A dense, fudgy chocolate brownie with a rich cocoa finish.", { group: "cakes" }),
    D("desserts", "brownie-ice-cream", "Brownie with Ice Cream", 189, null, "Warm chocolate brownie served with a scoop of creamy vanilla ice cream.", { group: "cakes" }),
    D("desserts", "burnt-butter-toast", "Burnt Butter Toast", 249, null, "Warm, crispy burnt butter and caramel toast with a scoop of ice cream: hot-and-cold in one bite.", { group: "cakes" }),
    D("desserts", "mango-haneul", "Seoul Mango Haneul", 249, null, "Creamy vanilla ice cream topped with ripe mango, dry fruits, and nata de coco.", { group: "sundaes" }),
    D("desserts", "seoark-snowberry", "Seoark Snowberry", 249, null, "Vanilla ice cream layered with strawberry and blueberry, finished with thick milk, crunchy dry fruits, and nata de coco.", { group: "sundaes" }),
    D("desserts", "choco-han-fusion", "Choco Han Fusion", 239, null, "Rich chocolate ice cream loaded with choco chips, brownie pieces, chocolate sauce, and chewy tapioca pearls.", { group: "sundaes" }),
    D("desserts", "ice-cream-sundae", "Ice Cream Sundae", 189, null, "Vanilla, strawberry and chocolate with our signature toppings.", { group: "sundaes" }),
    D("desserts", "subak-hwachae", "Subak Hwachae", 249, null, "The viral Korean watermelon cooler with watermelon, boba, sago, jellies, and sweet chilled milk.", { group: "hwachae", badge: "viral in Korea" }),
    D("desserts", "ddalki-hwachae", "Ddalki Hwachae", 249, null, "The viral Korean strawberry drink with fresh strawberries, boba, sago, jellies, and sweet chilled milk.", { group: "hwachae", badge: "viral in Korea" }),
    D("desserts", "single-scoop", "Single Scoop", 89, null, "One scoop of your chosen flavour.", { group: "icecream", choose: [{ label: "Flavour", options: ["Vanilla", "Strawberry", "Chocolate"] }] }),
    D("desserts", "double-scoop", "Double Scoop", 169, null, "Two scoops: mix and match your flavours.", { group: "icecream", choose: [{ label: "Flavours", options: ["Vanilla", "Strawberry", "Chocolate"], max: 2 }] }),
  );

  return { restaurant: { name: "MOBA", ko: "모바", tagline: "Korean Resto-Cafe" }, categories, extras, dishes };
})();
