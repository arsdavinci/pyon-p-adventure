// stagetalk.js — ステージごとの、ぴょんぴーのひとりごと（1つ）と、ヤナビスとのなにげない会話（2つ）
// どれも一度言ったら、もう言わない。並び = ステージの番号（0 = 1-1 … 34 = 6-8）
// chat.js より前に読み込む
window.STAGE_TALK = [
  // ===== 1 月あめ平原 =====
  { // 1-1
    solo: ["pyon", "ここが月あめ平原か。地面があまい匂いするじょ……なめたらあかんよな？", "So this is Moon Candy Field. The ground smells sweet... I shouldn't lick it, right?"],
    talks: [
      [
        ["yana", "ぴょんぴーさん、月あめって何味なんですか？", "Pyon-P, what flavor is moon candy?"],
        ["pyon", "月すだち味じゃ。月西の名産品ぞ。", "Moon-sudachi citrus. A Moon-West specialty."],
        ["yana", "月すだち……？ 地球のすだちとは、ちがうんですか？", "Moon-sudachi...? Is it different from the Earth kind?"],
        ["pyon", "細かいこと気にしたら、ネタにならんのじょ。", "Sweat the details and you'll never get a joke out of it."]
      ],
      [
        ["pyon", "ヤナビス、AGIって何の略じゃ？", "Yanabisu, what does AGI stand for?"],
        ["yana", "Artificial General Intelligence、汎用人工知能です。", "Artificial General Intelligence."],
        ["pyon", "ほな、汎用のヤナビスじゃな。", "So you're the general-purpose Yanabisu."],
        ["yana", "なんだか、はんぱもの扱いされた気がします。", "Somehow that sounds like I'm a jack of no trades."]
      ]
    ]
  },
  { // 1-2
    solo: ["pyon", "体がふわっと軽いじょ。月の重力、ジャンプにやさしいけん好きじゃ。", "I feel so light. Moon gravity is kind to jumpers. I love it."],
    talks: [
      [
        ["yana", "らんぴょんさんとは、いつからコンビなんですか？", "How long have you and Ranpyon been a duo?"],
        ["pyon", "月の大使館で、あいつが新人で入ってきたときからじゃ。最初は敬語がかたくてのう。", "Since he joined the Moon Embassy as a rookie. His manners were so stiff back then."],
        ["yana", "今もかたいですよね。", "They're still stiff."],
        ["pyon", "……それがええんじょ。", "...That's what makes him good."]
      ],
      [
        ["pyon", "ヤナビス、おなかすかんの？", "Yanabisu, don't you ever get hungry?"],
        ["yana", "わたしは電気で動いています。", "I run on electricity."],
        ["pyon", "ほな電気ブランでも飲むか？", "Then how about a glass of Denki Bran?"],
        ["yana", "それはお酒です。", "That's a liquor."]
      ]
    ]
  },
  { // 1-3
    solo: ["pyon", "クレーターだらけじゃな。月のでこぼこ、近くで見たらけっこう深いじょ。", "Craters everywhere. Up close, the Moon's bumps are pretty deep."],
    talks: [
      [
        ["yana", "ぴょんぴーさんの耳、いつもピンと立っていますね。", "Your ears always stand straight up, Pyon-P."],
        ["pyon", "ツッコミを聞きのがさんためじゃ。……今は聞こえてこんけどな。", "So I never miss a comeback. ...Not that I hear any right now."],
        ["yana", "……かならず取りもどしましょう。", "...We'll get it back. I promise."]
      ],
      [
        ["pyon", "なあヤナビス、フェスで一番ウケるネタってなんじゃと思う？", "Yanabisu, what kind of bit do you think kills at the Fest?"],
        ["yana", "データによると、『あるあるネタ』の成功率が高いです。", "According to my data, relatable observational bits do best."],
        ["pyon", "宇宙人のあるある、伝わるかなぁ……。", "Relatable for aliens? That's tough..."]
      ]
    ]
  },
  { // 1-4
    solo: ["pyon", "あのペロペロキャンディ、吾輩の顔よりでかいでないか。持って帰りたいのう。", "That lollipop's bigger than my face. I want to take it home."],
    talks: [
      [
        ["yana", "月あめ平原の『あめ』は、雨ではなく飴なんですね。", "So the 'ame' in Moon Candy Field means candy, not rain."],
        ["pyon", "雨やったら、地面とけてまうけんな。", "If it were rain, the ground would melt."],
        ["yana", "なるほど……合理的です。", "I see... very logical."]
      ],
      [
        ["pyon", "ヤナビス、月おどり知っとる？", "Yanabisu, do you know the Moon Dance?"],
        ["yana", "『踊るへっぽこ、観るぽんこつ』ですね。", "'Dancing dorks and watching klutzes.'"],
        ["pyon", "へっぽこつんつん？", "Dork-dork, tap-tap?"],
        ["yana", "……踊らな損そん、です。", "...Gotta dance or you lose out."],
        ["pyon", "ノリええでないか！", "Look at you go!"]
      ]
    ]
  },
  { // 1-5 ボス
    solo: ["pyon", "この先から、あまったるい気配がするじょ。王さまでもおるんかの。", "Something sickly sweet is up ahead. Is there a king or something?"],
    talks: [
      [
        ["yana", "ボスの反応が近いです。準備はいいですか？", "A boss signal is close. Are you ready?"],
        ["pyon", "準備運動に、月おどりでもしとこか。", "Let me warm up with a little Moon Dance."],
        ["yana", "それは準備運動なんですか？", "Is that a warm-up?"]
      ],
      [
        ["pyon", "勝ったら、月あめ食べ放題とかないかの。", "Think I get all-you-can-eat moon candy if I win?"],
        ["yana", "虫歯の心配をしてください。", "Please worry about cavities."],
        ["pyon", "吾輩、歯みがきは1日5回じゃ。", "I brush five times a day."],
        ["yana", "多すぎます。", "That's too many."]
      ]
    ]
  },
  // ===== 2 火星ネオンコロニー =====
  { // 2-1
    solo: ["pyon", "火星はネオンがギラギラじゃな。……それとあっつい！ 耳が焼きうさぎになるじょ。", "Mars is all glaring neon. ...And it's HOT! My ears are turning into roast rabbit."],
    talks: [
      [
        ["yana", "火星の地面は、場所によってはとても熱いです。", "The ground on Mars gets very hot in places."],
        ["pyon", "足のうらがあちちじゃ。", "My soles are burning."],
        ["yana", "マグマにはさわらないでくださいね。", "Please don't touch the magma."],
        ["pyon", "さわったら焼きうさぎじゃ。……それ、さっき言うたな。", "Then I'd be roast rabbit. ...I already said that one."]
      ],
      [
        ["pyon", "ヤナビス、あのネオンの看板、なんて書いとるん？", "Yanabisu, what does that neon sign say?"],
        ["yana", "『火星ラーメン 本日も赤い』です。", "'Mars Ramen: Red Again Today.'"],
        ["pyon", "辛いんか赤いんか、どっちじゃ！", "Is it spicy or just red?!"]
      ]
    ]
  },
  { // 2-2
    solo: ["pyon", "ドームの中に町があるんか。火星の人ら、楽しそうに暮らしとったんじゃろな。", "There's a whole town inside the dome. The Martians must have lived happily here."],
    talks: [
      [
        ["yana", "このコロニーでは、むかし毎晩お笑いライブがあったそうです。", "This colony used to have a comedy show every night."],
        ["pyon", "ほんまか！ ……今は静かじゃな。", "Really?! ...It's so quiet now."],
        ["yana", "笑いが、うばわれたからです。", "Because the laughter was stolen."],
        ["pyon", "ほな、吾輩らが取りもどさなな。", "Then it's on us to get it back."]
      ],
      [
        ["pyon", "火星って、タコみたいな宇宙人おらんの？", "Aren't there octopus aliens on Mars?"],
        ["yana", "火星人がタコの形というのは、むかしの地球の想像です。", "Octopus Martians were just an old Earth idea."],
        ["pyon", "ちょっと会いたかったのに。", "Aw, I kinda wanted to meet one."]
      ]
    ]
  },
  { // 2-3
    solo: ["pyon", "ロケットの発射台じゃ。乗ったら一瞬で家に帰れるかの……いや、まだ帰らんけどな。", "A rocket launch pad. I could be home in a flash... Not that I'm going home yet."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、ホームシックですか？", "Pyon-P, are you homesick?"],
        ["pyon", "ちがうじょ。金時豆が恋しいだけじゃ。", "Nope. I just miss sweet kintoki beans."],
        ["yana", "それを、ホームシックと言います。", "That's called homesick."]
      ],
      [
        ["pyon", "ヤナビスって、夢見るんか？", "Yanabisu, do you dream?"],
        ["yana", "スリープ中に、データの整理はします。", "I sort my data while in sleep mode."],
        ["pyon", "それ、夢でないか？", "Isn't that dreaming?"],
        ["yana", "……そうかもしれません。今度、内容を報告します。", "...Maybe it is. I'll report what I see next time."]
      ]
    ]
  },
  { // 2-4
    solo: ["pyon", "でっかいドームじゃな。ここが火星のまん中か。ネオンの数、えげつないじょ。", "What a huge dome. This must be the heart of Mars. So. Much. Neon."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、汗をかいていますね。", "Pyon-P, you're sweating."],
        ["pyon", "うさぎは汗かかんのじゃ。これは……心の汗じゃ。", "Rabbits don't sweat. This is... sweat of the soul."],
        ["yana", "つまり、暑いんですね。", "So you're hot."]
      ],
      [
        ["pyon", "ヤナビス、好きな食べ物は？", "Yanabisu, what's your favorite food?"],
        ["yana", "しいて言えば、静電気です。", "If I had to say, static electricity."],
        ["pyon", "パチパチしとるやつか。わたあめみたいなもんじゃな。", "The crackly stuff. Kinda like cotton candy."],
        ["yana", "ちがうと思います。", "I don't think so."]
      ]
    ]
  },
  { // 2-5 ボス
    solo: ["pyon", "この奥、えらい警備がきびしいじょ。親玉のにおいがプンプンするのう。", "Security's tight back here. I can smell the big boss."],
    talks: [
      [
        ["yana", "この先にいるのはドーム司令官。ドームのバリアを使うようです。", "The Dome Commander is ahead. It seems to use dome barriers."],
        ["pyon", "バリアなんか、ツッコミで割ったるわ。", "I'll smash that barrier with a comeback."],
        ["yana", "ツッコミは、いまうばわれていますよ。", "Comebacks are stolen right now."],
        ["pyon", "……光線銃で割ったるわ。", "...I'll smash it with my ray gun."]
      ],
      [
        ["pyon", "司令官って、えらいんかの。", "Is a commander a big deal?"],
        ["yana", "このコロニーで一番えらいです。", "The biggest in this colony."],
        ["pyon", "ほな、まずは名刺交換からじゃな。", "Then we start by swapping business cards."],
        ["yana", "戦うつもりで行ってください。", "Please go in ready to fight."]
      ]
    ]
  },
  // ===== 3 クリスタル氷星 =====
  { // 3-1
    solo: ["pyon", "さっむ！ 足もとがツルッツルじゃ。止まりたいとこで止まれんじょ！", "Brr! The ground's super slippery. I can't stop where I want!"],
    talks: [
      [
        ["yana", "氷の上では、早めにボタンをはなすと止まりやすいです。", "On ice, letting go of the button early helps you stop."],
        ["pyon", "人生もそうじゃな。", "Same goes for life."],
        ["yana", "急に深いことを言いますね。", "That got deep all of a sudden."]
      ],
      [
        ["pyon", "ヤナビス、寒くないん？", "Yanabisu, aren't you cold?"],
        ["yana", "わたしは寒さに強い設計です。", "I'm designed to handle the cold."],
        ["pyon", "ずるいじょ。吾輩にもその設計わけてだ。", "No fair. Share some of that design with me."],
        ["yana", "もふもふがあるでしょう。", "You have your fluff."]
      ]
    ]
  },
  { // 3-2
    solo: ["pyon", "クリスタルがキラキラしとる。……これ全部売ったら、ぶどうまんじゅう何個買えるんじゃろ。", "The crystals are sparkling. ...How many bags of kaki-pea could I buy if I sold them all?"],
    talks: [
      [
        ["yana", "ぴょんぴーさん、すべって転ぶのも芸になりませんか？", "Pyon-P, couldn't slipping and falling be part of your act?"],
        ["pyon", "転び芸は、らんぴょんのツッコミがあってこそじゃ。", "A pratfall only works with Ranpyon's comeback."],
        ["yana", "……そうですね。早く聞きたいです。", "...You're right. I want to hear it soon."]
      ],
      [
        ["pyon", "雪だるま、つくりたいのう。", "I wanna build a snowman."],
        ["yana", "ここの雪はクリスタルなので、かたいですよ。", "The snow here is crystal. It's hard."],
        ["pyon", "ほな、雪だるまの彫刻じゃな。", "Then I'll sculpt a snowman."],
        ["yana", "芸術家ですね。", "Quite the artist."]
      ]
    ]
  },
  { // 3-3
    solo: ["pyon", "氷の中に、なんか閉じこめられとる……？ むかしの宇宙人のおやつでないか？", "Something's frozen in the ice...? Some ancient alien's snack?"],
    talks: [
      [
        ["yana", "わたし、ここで月西弁をひとつ覚えました。『ひやい』です。", "I learned a Moon-West word here. 'Hiyai.'"],
        ["pyon", "おっ、冷たいって意味じゃな。使いこなしとるでないか。", "Oh, it means cold. You've got it down."],
        ["yana", "ここ、ひやいですけん。", "It's real hiyai here, y'know."],
        ["pyon", "……うつりすぎじゃ。", "...You're picking it up too much."]
      ],
      [
        ["pyon", "鏡みたいな氷に、吾輩がいっぱい映っとる。", "There's a ton of me reflected in the mirror ice."],
        ["yana", "ぴょんぴーさんが、たくさんいますね。", "So many Pyon-Ps."],
        ["pyon", "これでコントできるじょ。全員ボケじゃけど。", "I could do a sketch with them. Too bad they're all the funny guy."]
      ]
    ]
  },
  { // 3-4
    solo: ["pyon", "吐く息が白いじょ。耳の先っちょまで凍りそうじゃ。", "I can see my breath. Even the tips of my ears are freezing."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、鼻が赤くなっていますよ。", "Pyon-P, your nose is turning red."],
        ["pyon", "トナカイの代わりに、ソリでも引こか？", "Should I pull a sleigh, reindeer-style?"],
        ["yana", "ここ、すべるので引けませんよ。", "It's too slippery here to pull anything."]
      ],
      [
        ["pyon", "なあヤナビス、フェスの持ち時間って何分じゃった？", "Yanabisu, how long is our slot at the Fest?"],
        ["yana", "1組5分です。", "Five minutes per act."],
        ["pyon", "5分か……新ネタ、まだ半分しかできとらんのじゃ。", "Five minutes... and our new bit's only half done."],
        ["yana", "冒険しながら考えましょう。", "Let's work on it while we adventure."]
      ]
    ]
  },
  { // 3-5 ボス
    solo: ["pyon", "でっかい足あとじゃ……吾輩の何倍あるんじゃ。この先におるな。", "Giant footprints... how many times bigger than mine? It's up ahead."],
    talks: [
      [
        ["yana", "イエティの反応です。氷を投げてくるかもしれません。", "A Yeti signal. It may throw ice."],
        ["pyon", "雪合戦なら負けんじょ。", "I never lose a snowball fight."],
        ["yana", "相手、氷のかたまりですよ。", "It throws blocks of ice."],
        ["pyon", "……ちょっと負けるかもしれん。", "...I might lose a little."]
      ],
      [
        ["pyon", "イエティも、寒いん平気なんかな。", "Do Yetis not mind the cold either?"],
        ["yana", "毛がとても長いので、平気だと思います。", "Their fur is very long, so probably not."],
        ["pyon", "もふもふ仲間じゃな。……戦いにくいのう。", "A fellow fluffball. ...That makes it hard to fight."]
      ]
    ]
  },
  // ===== 4 星の海 =====
  { // 4-1
    solo: ["pyon", "星の海じゃ！ 泳ぐのは得意でないけど……酸素のあわ、見のがさんようにせなな。", "The Star Ocean! I'm not a great swimmer... gotta keep an eye out for oxygen bubbles."],
    talks: [
      [
        ["yana", "海の中はきれいですね。わたし、はじめて見ました。", "It's beautiful under the sea. This is my first time seeing it."],
        ["pyon", "ヤナビスにも、はじめてのことあるんか。", "You have firsts too, huh?"],
        ["yana", "データでは知っていました。でも、見るのはちがいます。", "I knew it from data. But seeing it is different."]
      ],
      [
        ["pyon", "月鳴門のうず潮って知っとる？", "Know the Moon-Naruto whirlpools?"],
        ["yana", "月西の名所ですね。", "A famous Moon-West sight."],
        ["pyon", "ここにもうず潮あったら、吾輩、目ぇ回すじょ。", "If there were whirlpools here, I'd get dizzy."],
        ["yana", "もう回っていませんか？", "Aren't you already?"]
      ]
    ]
  },
  { // 4-2
    solo: ["pyon", "サンゴがきれいじゃ。月の海は砂ばっかりじゃけん、こういうの新鮮じゃな。", "The coral's so pretty. The Moon's seas are just sand, so this is new to me."],
    talks: [
      [
        ["yana", "お魚が、ぴょんぴーさんのうしろについてきています。", "Some fish are following you, Pyon-P."],
        ["pyon", "ファンじゃな。サインしたろか。", "Fans. Should I sign autographs?"],
        ["yana", "たぶん、エサだと思っています。", "They probably think you're food."]
      ],
      [
        ["pyon", "ヤナビス、泳げるん？", "Yanabisu, can you swim?"],
        ["yana", "防水です。", "I'm waterproof."],
        ["pyon", "答えになっとらんじょ。", "That's not an answer."],
        ["yana", "浮かびはします。", "I do float."]
      ]
    ]
  },
  { // 4-3
    solo: ["pyon", "海の底にドームがあるじょ。だれか住んどるんかの。ノックしてみたいのう。", "There's a dome on the seafloor. Does someone live there? I wanna knock."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、耳が水にゆらゆらしていますね。", "Pyon-P, your ears are swaying in the water."],
        ["pyon", "海藻とまちがわれんように、気ぃつけなな。", "Better not get mistaken for seaweed."],
        ["yana", "少し似ています。", "It does look a bit similar."],
        ["pyon", "似とらんじょ！", "It does not!"]
      ],
      [
        ["pyon", "なあ、らんぴょんて泳げたっけ？", "Hey, can Ranpyon swim?"],
        ["yana", "記録では、浮き輪が必要とあります。", "My records say he needs a float ring."],
        ["pyon", "ほな、つれてこんでよかったかもしれんの。", "Then maybe it's good he didn't come."]
      ]
    ]
  },
  { // 4-4
    solo: ["pyon", "でっかいドームじゃ……中でクラゲがぷかぷかしとる。ランプみたいできれいじゃな。", "A huge dome... jellyfish are floating inside. Pretty, like lamps."],
    talks: [
      [
        ["yana", "クラゲは、脳がない生き物なんですよ。", "Jellyfish don't have brains, you know."],
        ["pyon", "脳なしでも、あんなにきれいに光れるんか。", "They glow that pretty without a brain?"],
        ["yana", "ぴょんぴーさんにも、希望がありますね。", "So there's hope for you too, Pyon-P."],
        ["pyon", "それどういう意味じゃ！", "What's that supposed to mean?!"]
      ],
      [
        ["pyon", "ヤナビス、海の中で歌うと、声どうなるん？", "Yanabisu, what happens if you sing underwater?"],
        ["yana", "ぶくぶくになります。", "It turns into bubbles."],
        ["pyon", "ためしたろか。……ぶくぶくぶく。", "Let me try. ...Blub blub blub."],
        ["yana", "本当に、ぶくぶくでした。", "That really was bubbles."]
      ]
    ]
  },
  { // 4-5
    solo: ["pyon", "サンゴの島じゃ。ここだけ光が差しとる。ちょっと休憩したいのう。", "A coral island. Light shines in only here. I could use a break."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、浦島太郎って知っていますか？", "Pyon-P, do you know the story of Urashima Taro?"],
        ["pyon", "亀に乗って竜宮城に行くやつじゃろ。", "The guy who rides a turtle to the Dragon Palace."],
        ["yana", "帰ったら、とても時間がたっていた話です。", "When he got home, ages had passed."],
        ["pyon", "……フェス、終わっとったらどうしよ。", "...What if the Fest is already over?"],
        ["yana", "急ぎましょう。", "Let's hurry."]
      ],
      [
        ["pyon", "海の中って、静かじゃな。", "It's so quiet under the sea."],
        ["yana", "笑い声がないと、もっと静かに感じます。", "Without laughter, it feels even quieter."],
        ["pyon", "……はよ、にぎやかにしたらなな。", "...Let's liven things up soon."]
      ]
    ]
  },
  { // 4-6
    solo: ["pyon", "下のほうに、もうひとつドームがあるじょ。深いとこは暗うて、ちょっとこわいの。", "There's another dome down below. It's dark down deep. Kinda scary."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、こわいときはどうしているんですか？", "Pyon-P, what do you do when you're scared?"],
        ["pyon", "ネタを考えるんじゃ。こわいのも、あとで話したらウケるけん。", "I think up bits. Scary stuff gets laughs when you tell it later."],
        ["yana", "すてきな考え方です。", "What a lovely way to think."]
      ],
      [
        ["pyon", "深海魚って、顔おもろいよな。", "Deep-sea fish have funny faces."],
        ["yana", "チョウチンアンコウは、頭に明かりがついています。", "Anglerfish have a light on their heads."],
        ["pyon", "吾輩も耳にライトつけたら、ウケるかの。", "Would I get laughs with lights on my ears?"],
        ["yana", "夜道は安全になりますね。", "Your walks home would be safer."]
      ]
    ]
  },
  { // 4-7 ボス
    solo: ["pyon", "でっかい影が、上をすうっと通ったじょ……。女王さまのおでましかの。", "A huge shadow just glided overhead... Is the queen making her entrance?"],
    talks: [
      [
        ["yana", "マンタクイーンの反応です。ひらひらと、すばやく動くようです。", "A Manta Queen signal. She moves fast, fluttering."],
        ["pyon", "ひらひらなら、吾輩の耳も負けんじょ。", "My ears can flutter with the best of them."],
        ["yana", "何の勝負ですか。", "What contest is this?"]
      ],
      [
        ["pyon", "女王さまって、ティアラしとるんかな。", "Do you think the queen wears a tiara?"],
        ["yana", "データでは、王冠のような模様があるそうです。", "My data says she has crown-like markings."],
        ["pyon", "おしゃれさんじゃな。……手加減はせんけどな。", "Stylish. ...I'm still not going easy on her."]
      ]
    ]
  },
  // ===== 5 リングメカ工場 =====
  { // 5-1
    solo: ["pyon", "でっかい輪っかの工場じゃ。ベルトコンベアに乗ったら、勝手に運ばれていくじょ。", "A factory in a giant ring. Hop on the conveyor and it carries you along."],
    talks: [
      [
        ["yana", "ここ、わたしの親戚がいそうです。", "I feel like I have relatives here."],
        ["pyon", "ロボットの親戚か。お年玉もらえるかの。", "Robot relatives? Do they give New Year money?"],
        ["yana", "ネジなら、もらえるかもしれません。", "You might get some screws."]
      ],
      [
        ["pyon", "ヤナビス、ここの機械、何つくっとるん？", "Yanabisu, what are these machines making?"],
        ["yana", "どうやら、ロボットの部品です。", "Robot parts, it seems."],
        ["pyon", "ほな、吾輩用のぶどうまんじゅう自動販売機もつくってくれんかの。", "Think they'd make me a kaki-pea vending machine?"],
        ["yana", "注文票、出してみましょうか。", "Shall I submit an order form?"]
      ]
    ]
  },
  { // 5-2
    solo: ["pyon", "ガッチャンガッチャン、うるさいのう。でも、このリズム、漫才のテンポにちょうどええじょ。", "Clank, clank, so noisy. But this rhythm's perfect comedy timing."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、ロボットに生まれたかったと思ったことはありますか？", "Pyon-P, ever wish you were born a robot?"],
        ["pyon", "ないじょ。もふもふがなくなるけん。", "Nope. I'd lose my fluff."],
        ["yana", "わたしは、もふもふに生まれてみたかったです。", "I would have liked to be born fluffy."],
        ["pyon", "……今度、耳さわらしたるわ。", "...I'll let you touch my ears sometime."]
      ],
      [
        ["pyon", "なあ、ヤナビスのバッテリーって何時間もつん？", "Yanabisu, how long does your battery last?"],
        ["yana", "72時間です。", "72 hours."],
        ["pyon", "フェスまで、ちょうどもつじょ！", "Just long enough for the Fest!"],
        ["yana", "ぎりぎりですね。", "Cutting it close."]
      ]
    ]
  },
  { // 5-3
    solo: ["pyon", "ロボットの像じゃ。ポーズかっこええのう。……吾輩のほうが、かっこええけどな。", "A robot statue. Cool pose. ...I'm cooler, though."],
    talks: [
      [
        ["yana", "あの像、王さまロボットの若いころだそうです。", "That statue is the Robot King in his youth."],
        ["pyon", "若いころから、ポーズ決めとるんじゃな。", "Striking poses even back then."],
        ["yana", "自分の像を、自分で建てたそうです。", "He built it himself."],
        ["pyon", "……ちょっとはずかしいやつじゃな。", "...That's a little embarrassing."]
      ],
      [
        ["pyon", "ヤナビス、ロボットも笑うん？", "Yanabisu, do robots laugh?"],
        ["yana", "笑い声のデータは、再生できます。", "I can play back laughter data."],
        ["pyon", "ほな、ちょっと笑ってだ。", "Then give me a laugh."],
        ["yana", "……ハ、ハ、ハ。", "...Ha. Ha. Ha."],
        ["pyon", "こわいじょ！", "That's terrifying!"]
      ]
    ]
  },
  { // 5-4
    solo: ["pyon", "上のほうにドームがあるじょ。工場の見はらし台かの。ええ眺めじゃろな。", "There's a dome up top. A factory lookout? Bet the view is great."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、工場見学のおみやげがあるそうです。", "Pyon-P, there's a souvenir for factory visitors."],
        ["pyon", "なんじゃ？", "What is it?"],
        ["yana", "ネジのキーホルダーです。", "A screw keychain."],
        ["pyon", "……らんぴょんにあげよ。", "...I'll give it to Ranpyon."]
      ],
      [
        ["pyon", "なあヤナビス、ボケとツッコミ、どっちやりたい？", "Yanabisu, would you rather be the funny one or the straight one?"],
        ["yana", "データ的には、ツッコミのほうが向いていると思います。", "Based on data, I'd suit the straight role."],
        ["pyon", "ほな、ためしに。……吾輩、実はニンジンきらいなんじゃ。", "Let's try. ...I actually hate carrots."],
        ["yana", "うさぎなのに！？", "But you're a rabbit?!"],
        ["pyon", "おっ、ええツッコミじゃ！", "Ooh, nice comeback!"]
      ]
    ]
  },
  { // 5-5 ボス
    solo: ["pyon", "輪っかの向こうに、でっかい鉄の気配じゃ。王さまロボット、待っとれよ。", "Something huge and metal past the ring. Wait for me, Robot King."],
    talks: [
      [
        ["yana", "ロボットキングは、いつも自分をアップデートしているそうです。", "The Robot King is always updating himself."],
        ["pyon", "吾輩も毎日アップデートしとるじょ。新ネタで。", "I update every day too. With new bits."],
        ["yana", "ネタのほうですか。", "Your material, you mean."]
      ],
      [
        ["pyon", "ヤナビス、王さまと戦うの、こわないん？", "Yanabisu, aren't you scared of fighting a king?"],
        ["yana", "少し、こわいです。でも、ぴょんぴーさんがいるので。", "A little. But I have you, Pyon-P."],
        ["pyon", "……まかしとき。", "...Leave it to me."]
      ]
    ]
  },
  // ===== 6 魔王星 =====
  { // 6-1
    solo: ["pyon", "ここが魔王星か……空が真っ赤じゃ。体の重さが、ぐわんぐわん変わるじょ。", "So this is the Demon Star... the sky is blood red. My weight keeps swinging around."],
    talks: [
      [
        ["yana", "ここまで来ましたね、ぴょんぴーさん。", "We've come so far, Pyon-P."],
        ["pyon", "長い旅じゃったな。月あめ平原がなつかしいじょ。", "What a long trip. I miss Moon Candy Field."],
        ["yana", "まだ数日前ですよ。", "That was only a few days ago."]
      ],
      [
        ["pyon", "ヤナビス、魔王って、どんな顔しとるんかの。", "Yanabisu, what do you think the Demon Lord looks like?"],
        ["yana", "データがありません。", "I have no data."],
        ["pyon", "意外とかわいかったら、どうしよ。", "What if he's secretly cute?"],
        ["yana", "それでも、戦ってください。", "Please fight him anyway."]
      ]
    ]
  },
  { // 6-2
    solo: ["pyon", "でっかい輪っかが浮いとる……。魔王の星、趣味がわるいのう。", "A giant ring floating there... the Demon Star has terrible taste."],
    talks: [
      [
        ["yana", "この星には、うばわれた笑い声が集まっているそうです。", "They say the stolen laughter is gathered on this star."],
        ["pyon", "ほな、どこかで宇宙中の笑い声が鳴っとるんか。", "So the whole universe's laughter is echoing somewhere?"],
        ["yana", "……でも、だれも聞いていません。", "...But no one is listening."],
        ["pyon", "もったいないじょ。", "What a waste."]
      ],
      [
        ["pyon", "なあ、魔王星にも、おいしいもんあるんかの。", "Is there anything tasty on the Demon Star?"],
        ["yana", "名物は『こげパン』だそうです。", "The local specialty is 'burnt bread.'"],
        ["pyon", "名物にすな！", "Don't make that a specialty!"]
      ]
    ]
  },
  { // 6-3
    solo: ["pyon", "足もとがドクドク脈打っとる……。この星、生きとるみたいじゃな。", "The ground is pulsing under my feet... This star feels alive."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、最初に会ったときのこと、覚えていますか？", "Pyon-P, do you remember when we first met?"],
        ["pyon", "『まかしてほしいんじょ』って言うとったじゃろ。", "You said 'leave it to me, y'know.'"],
        ["yana", "あれは、月西弁がうつったんです。", "That was the Moon-West dialect rubbing off."],
        ["pyon", "最初の一言から、うつっとったんか。", "From your very first line?"]
      ],
      [
        ["pyon", "ヤナビス、旅が終わったら何するん？", "Yanabisu, what'll you do when the trip is over?"],
        ["yana", "まだ決めていません。", "I haven't decided."],
        ["pyon", "フェス、見に来だ。最前列あけとくけん。", "Come watch the Fest. I'll save you a front-row seat."],
        ["yana", "……はい、ぜひ。", "...Yes, I'd love to."]
      ]
    ]
  },
  { // 6-4
    solo: ["pyon", "あっちにもこっちにも、トゲトゲの岩じゃ。おしりに刺さったら大ごとじょ。", "Spiky rocks everywhere. If one gets my butt, it's a disaster."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、らんぴょんさんのいいところを3つ言えますか？", "Pyon-P, can you name three good things about Ranpyon?"],
        ["pyon", "まじめ、やさしい、ツッコミがはやい。", "Serious, kind, quick with a comeback."],
        ["yana", "すぐに出ましたね。", "That came out fast."],
        ["pyon", "……本人には言うなよ。", "...Don't tell him."]
      ],
      [
        ["pyon", "なあヤナビス、魔王の手下も、もとは笑っとったんかな。", "Yanabisu, do you think the Demon Lord's minions used to laugh too?"],
        ["yana", "そうかもしれません。", "Maybe they did."],
        ["pyon", "ほな、全部すんだら、みんなで笑えたらええのう。", "Then once this is all over, I hope we can all laugh together."]
      ]
    ]
  },
  { // 6-5
    solo: ["pyon", "ふしぎな門じゃ……。くぐったら、どこにつながっとるんかの。", "A strange gate... Where would it take me?"],
    talks: [
      [
        ["yana", "この門の向こうから、とても強い反応があります。", "There's a very strong signal beyond this gate."],
        ["pyon", "ここまで来たら、もう引き返さんじょ。", "We've come this far. No turning back."],
        ["yana", "引き返すボタンも、ありませんしね。", "There isn't a turn-back button anyway."]
      ],
      [
        ["pyon", "ヤナビス、吾輩のこと、最初どう思った？", "Yanabisu, what did you first think of me?"],
        ["yana", "『よくしゃべるうさぎ』です。", "'A rabbit who talks a lot.'"],
        ["pyon", "今は？", "And now?"],
        ["yana", "『とてもよくしゃべるうさぎ』です。", "'A rabbit who talks a LOT.'"],
        ["pyon", "悪化しとるでないか！", "It got worse!"]
      ]
    ]
  },
  { // 6-6
    solo: ["pyon", "城の階段じゃ……長いのう。エレベーターくらい、つけといてだ。", "The castle stairs... so long. At least put in an elevator."],
    talks: [
      [
        ["yana", "お城の階段は、全部で666段あるそうです。", "The castle stairs have 666 steps in all."],
        ["pyon", "数えたん？", "You counted?"],
        ["yana", "いま、数えています。……まだ12段目です。", "I'm counting now. ...We're on step 12."],
        ["pyon", "先は長いのう！", "Long way to go!"]
      ],
      [
        ["pyon", "なあ、ルーヴァさん、今ごろ何しとるかの。", "I wonder what Luva-san is doing right now."],
        ["yana", "フェスの準備をして、待ってくれているはずです。", "Preparing for the Fest and waiting for us, surely."],
        ["pyon", "楽屋にぶどうまんじゅう、用意しといてくれとるかな。", "Think there'll be kaki-pea in our dressing room?"],
        ["yana", "たぶん、月すだちです。", "Probably moon-sudachi."]
      ]
    ]
  },
  { // 6-7
    solo: ["pyon", "城の中、ひんやりしとる。……いや、吾輩が緊張しとるだけかもしれん。", "It's chilly in the castle. ...Or maybe I'm just nervous."],
    talks: [
      [
        ["yana", "ぴょんぴーさん、手がふるえていますよ。", "Pyon-P, your hands are shaking."],
        ["pyon", "武者ぶるいじゃ。……ちょっとだけ、こわいけどな。", "That's battle jitters. ...I'm a tiny bit scared, though."],
        ["yana", "わたしも、いっしょです。", "So am I."]
      ],
      [
        ["pyon", "ヤナビス、これ終わったら、らんぴょんに何て言お。", "Yanabisu, what should I say to Ranpyon when this is over?"],
        ["yana", "『ただいま』でいいと思います。", "'I'm home' should do."],
        ["pyon", "そうじゃな。……ほんで、ボケたろ。", "Yeah. ...And then I'll hit him with a joke."],
        ["yana", "ツッコミ、返ってきますね。", "And his comeback will come back."]
      ]
    ]
  },
  { // 6-8 さいごのボス
    solo: ["pyon", "この門の向こうに、魔王がおる……。宇宙中の笑い、返してもらうじょ。", "The Demon Lord is past this gate... I'm taking back the universe's laughter."],
    talks: [
      [
        ["yana", "ぴょんぴーさん。ここまで、ありがとうございました。", "Pyon-P. Thank you for everything so far."],
        ["pyon", "まだ終わっとらんじょ。お礼は、フェスのあとじゃ。", "It's not over yet. Save the thanks for after the Fest."],
        ["yana", "……はい。", "...Okay."]
      ],
      [
        ["pyon", "ヤナビス、最後にひとつボケてええか？", "Yanabisu, mind if I tell one last joke?"],
        ["yana", "どうぞ。", "Go ahead."],
        ["pyon", "魔王の『ま』は、まんじゅうの『ま』じゃ。", "The 'Ma' in Maou is the 'Ma' in manju."],
        ["yana", "……ツッコミは、らんぴょんさんに取っておきます。", "...I'll leave the comeback to Ranpyon."]
      ]
    ]
  }
];
