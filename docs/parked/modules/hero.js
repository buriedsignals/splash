/* ===========================================================================
 * HERO — a block of dispersive glass, with a newspaper page suspended in it.
 *
 * Raymarched signed distance field: a rounded box, swollen and hollowed by
 * travelling sine lobes. The body is glass, so every ray is refracted twice —
 * once in, once out — and four of those paths are marched at four different
 * indices of refraction. Fourteen spectral samples ride on interpolations of
 * those four, which is what fans the white studio panels into colour along
 * every edge.
 *
 * The page is not a reflection. It is an opaque sheet inside the volume: the
 * interior march stops on it, so each wavelength reaches the type along its
 * own bent path and the ink comes apart into colour where the glass is
 * thickest. The page itself is a real article, typeset onto a canvas at boot.
 *
 * The render is room-referred and colourless; the field's blue is applied at
 * the last step, so an untouched ray lands exactly on the section's ground and
 * the body reads by its shadow and its highlights rather than by its own tint.
 *
 * Drawn into a module-owned buffer at a fraction of the canvas, then blitted:
 * a full-resolution raymarch of this depth would not hold sixty frames.
 * ======================================================================== */

Stage.register(
  (() => {
    // The ground is a design decision, so it stays in the document: the module
    // reads data-ground off the section and falls back to the house ink. The
    // render is referenced to it, so the two can never drift apart.
    // Is the hero's own arc in the document at all? Read once, here, because
    // the camera and the webs are set up long before the module is returned.
    const ARC0 = !!document.querySelector("#hero-arc");

    const INK = [0.078, 0.078, 0.11]; // #14141c
    const ground = INK.slice();
    function readGround(el) {
      const h = el && el.dataset && el.dataset.ground;
      if (!h || !/^#[0-9a-f]{6}$/i.test(h)) return;
      for (let i = 0; i < 3; i++)
        ground[i] = parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    }

    // "The Tomb of Tutankhamen", Prof. G. Elliot Smith, The Daily Telegraph,
    // 1923. Public domain, text as published (Wikisource). The layout below
    // takes whatever it is handed — swap ARTICLE to print something else.
    /* Eleven front pages, all public domain, all fetched from Wikisource as
     * published. One is drawn at random per load, so the block is never
     * showing the same page twice running — and the type inside the glass is
     * real reporting rather than a specimen. Each entry carries its own
     * masthead, dateline and byline: the sheet is set from the article, not
     * decorated around one. */
    const ARTICLES = [
      {
        paper: "The Daily Telegraph",
        date: "LONDON, 1923",
        by: "PROFESSOR G. ELLIOT SMITH",
        head: ["THE TOMB OF", "TUTANKHAMEN"],
        sub: "WHAT THE DISCOVERY MEANS FOR THE HISTORY OF CIVILISATION",
        body: [
          {
            h: 0,
            t: 'Dr. Graftoon Elliot-Smith is a distinguished Australian scientist, and is Professor of Anatomy at London University. For nine years he lived in Egypt, where he has done a great deal of work on Royal mummies, and he is the author of the official catalogue of "Royal Egyptian Mummies." Lord Carnarvon\'s advisers have consulted him with regard to the unrolling of the mummy of Tutankhamen, which is expected to be found in the third chamber of the recently discovered tomb.',
          },
          {
            h: 0,
            t: "When the eyes of all the world are focussed on the tomb of Tutankhamen and the fresh revelation it affords of the superb achievements of the ancient Egyptians in the arts and crafts, it is worth while to consider how this new discovery is likely to affect our attitude to the history of civilisation and a fuller recognition of the human motives that found expression in its creation and development. Apart from the demonstration it affords of the fabulous wealth that was hidden away more than thirty centuries ago in the valley of the tombs of the kings, the new discovery appeals as an aesthetic revelation of dazzling brilliance rather than as an addition to our knowledge. So far its effect has been to force the scholar and the man in the street to take an interest in the civilisation that was capable of producing such perfect works of art, and to ask themselves whether this precocious culture was really so exotic as it is commonly supposed to be, or whether, on the contrary, such achievements on the very threshold of a yet unenlightened Europe did not exert a far greater influence than it is usual to accord them.",
          },
          {
            h: 0,
            t: 'But at present we are concerned simply in considering what is the significance of the discoveries so far made; the furniture, which has never been surpassed in the perfection of its workmanship and exquisite decoration; linen of a fineness and a beauty of texture that have never been excelled; carved alabaster vases such as the world has never seen before; and statues that afford some justification for the ancient belief that they were, in truth, "living images." What is the meaning of all this lavish display of skill and beauty? Why was so much wealth poured into the hidden recesses of this desolate ravine, and the most exquisite products of the world\'s achievement in the arts and crafts buried out of sight in this strange necropolis? The true answers to these questions reveal the motive force that brought about the development of civilisation and made Egypt the pioneer in its creation.',
          },
          { h: 1, t: "EMBALMING AND IMMORTALITY" },
          {
            h: 0,
            t: "All these elaborate preparations, the laborious and costly process of hewing the tomb out of the solid rock and furnishing it with such magnificence, were made because the ancient Egyptians believed that the King's body to be housed in it had been made imperishable. It was because they imagined when the body was embalmed the continuation of the King's existence had been assured that they provided him with food and raiment, the furniture and amulets, the jewels and the unguents, and other luxuries which he had been accustomed to enjoy, before he was taken to his \"eternal house\" in the desolate valley of the tombs. They can be no doubt that in the early days of Egyptian history this naive belief was regarded in all seriousness as the simple truth. In fact, the thoroughness with which at first the Egyptians gave concrete expression to their faith in making material provision for every want that the deceased might experience could only have been inspired by the confidence that all these preparations were indeed effective. This conviction was deeply rooted in the practice of mummifying the dead, preserving the body so that it should become incorruptible and everlasting; and this was supposed also to involve the feasibility of the prolongation of the dead man's existence.",
          },
          {
            h: 0,
            t: "The hope of survival was thus based upon the efficacy of the embalmer's art: and the extraordinary constancy with which for more than thirty centuries - for a span of years four times the length of time that separates us from the arrival of William the Conqueror in Britain - they persisted in their efforts to improve their methods and render more perfect this gruesome practice is a striking tribute to the fundamental importance of mummification to the Egyptians. The craft of the carpenter was first invented for the manufacture of coffins to protect the corpse; the stonemason's first experiments had for their aim the preparation of rock-cut chambers still further to ensure its safety; the first buildings worthy of being called architecture were intended to promote the welfare of the dead, to provide places to which relatives could bring food necessary for the dead man's sustenance, and a room to house his portrait statue - another art that was the outcome of the practice of mummification - which took his place at the temple of offerings and preserved his likeness for all time.",
          },
          {
            h: 0,
            t: "These elements of civilisation, the arts of architecture and sculpture, and the crafts of the carpenter and the stonemason, were thus direct results of the custom of embalming. But its influence in moulding ritual and belief was no less profound and far-reaching.",
          },
          { h: 1, t: "EARLY BELIEFS" },
          {
            h: 0,
            t: 'The belief in the possibility of the continuation of existence after death may have been (and probably was) much older than the Egyptians; but the evidence now available seems fairly decisive that the belief in immortality was not definitely formulated by mankind until the means had been devised of making the corpse everlasting, when "the corruptible body put on incorruption." Moreover, the ritual of the most primitive religions was based upon the practices of the early Egyptians for revivifying the mummy, or its surrogate, the mortuary statue, by burning incense, pouring out libations, opening its mouth to give it the breath of life, and performing a whole series of dramatic acts to animate it and restore its consciousness, and so make it possible for it not only to take an intelligent share in the life around it, but also to hear appeals for help and guidance and to answer such requests.',
          },
          {
            h: 0,
            t: "Egypt alone of the countries of antiquity provides the explanation of these strange beliefs and practices. They were devised by the concrete-minded people of the Nine Valley as part of a comprehensive philosophy of life and death which was formulated as a sort of life insurance, in accordance with the principles of which the deceased himself was supposed to be the beneficiary, and his reward an indefinite prolongation of existence.",
          },
          {
            h: 0,
            t: "This remarkable system of beliefs originated even before the beginning of civilisation, sixty centuries ago; but the latter event was responsible for intensifying the conviction of its reality and increasing men's hope in its potency.",
          },
          { h: 1, t: "THE DAWN OF CIVILISATION" },
          {
            h: 0,
            t: "Civilisation began when the Egyptians first devised the methods of agriculture and invented a system of irrigation. The irrigation engineer was the first man in the history of the world to control and organise the co-operative work of his fellow-men, and become the ruler of a whole community. If there si one lesson more than another than history has demonstrated in Egypt, equally in ancient and modern times, it is the absolute necessity of a strong and autocratic Government, because the conditions in the Nile Valley are such that the prosperity of the country and the welfare of the whole community is entirely dependent upon the just and equitable distribution of the waters of irrigation throughout the land. It is not to be wondered at that the engineer who successfully achieved this task, and in a very special and real sense controlled the lives and destinies of his people, became the King, whose beneficence was apotheosised after his death, so that he became the god Osiris, who was identified with the river, whose life-giving powers he controlled. For to a people who had never experienced anything of the kind before it must have seemed an altogether miraculous and superhuman act for one man to have in his absolute control the prosperity of a whole community and every individual unit of it.",
          },
        ],
        tpl: "broadsheet",
        cols: 3,
        cut: "wide",
        cap: "THE ANTECHAMBER OF THE TOMB. PHOTOGRAPH BY HARRY BURTON, 1922.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Tutankhamun_tomb_photographs_2_011.jpg/960px-Tutankhamun_tomb_photographs_2_011.jpg",
      },
      {
        paper: "The New York World",
        date: "NEW YORK, 1887",
        by: "NELLIE BLY",
        head: ["TEN DAYS IN A", "MAD-HOUSE"],
        sub: "BEHIND THE WALLS OF THE BLACKWELL'S ISLAND ASYLUM",
        body: [
          {
            h: 0,
            t: "“Here is a poor girl who has been drugged,” explained the judge. “She looks like my sister, and any one can see she is a good girl, I am interested in the child, and I would do as much for her as if she were my own. I want you to be kind to her,” he said to the ambulance surgeon. Then, turning to Mrs. Stanard, he asked her if she could not keep me for a few days until my case was inquired into. Fortunately, she said she could not, because all the women at the Home were afraid of me, and would leave if I were kept there. I was very much afraid she would keep me if the pay was assured her, and so I said something about the bad cooking and that I did not intend to go back to the Home. Then came the examination; the doctor looked clever and I had not one hope of deceiving him, but I determined to keep up the farce.",
          },
          {
            h: 0,
            t: "But I put out my tongue, which he looked at in a sagacious manner. Then he felt my pulse and listened to the beating of my heart. I had not the least idea how the heart of an insane person beat, so I held my breath all the while he listened, until, when he quit, I had to give a gasp to regain it. Then he tried the effect of the light on the pupils of my eyes. Holding his hand within a half inch of my face, he told me to look at it, then,",
          },
          {
            h: 0,
            t: "jerking it hastily away, he would examine my eyes. I was puzzled to know what insanity was like in the eye, so I thought the best thing under the circumstances was to stare. This I did, I held my eyes riveted unblinkingly upon his hand, and when he removed it I exerted all my strength to still keep my eyes from blinking.",
          },
          {
            h: 0,
            t: "“The pupils of her eyes have been enlarged ever since ​she came to the Home. “They have not changed once,” explained Mrs. Stanard. I wondered how she knew by whether they had or not, but I kept quiet.",
          },
          {
            h: 0,
            t: "“I believe she has been using belladonna,” said the doctor, and for the first time I was thankful that I was a little near-sighted, which of course answers for the enlargement of the pupils. I thought I might as well be truthful when I could without injuring my case, so I told him I was near-sighted, that I was not in the least ill, had never been sick, and that no one had a right to detain me when I wanted to find my trunks. I wanted to go home. He wrote a lot of things in a long, slender book, and then said he was going to take me home. The judge told him to take me and to be kind to me, and to tell the people at the hospital to be kind to me, and to do all they could for me. If we only had more such men as Judge Duffy, the poor unfortunates would not find life all darkness.",
          },
          {
            h: 0,
            t: "I began to have more confidence in my own ability now, since one judge, one doctor, and a mass of people had pronounced me insane, and I put on my veil quite gladly when I was told that I was to be taken in a carriage, and that afterward I could go home. “I am so glad to go with you,” I said, and I meant it. I was very glad indeed. Once more, guarded by Policeman Brockert, I walked through the little, crowded courtroom. I felt quite proud of myself as I went out a side door into an alleyway, where the ambulance was waiting. Near the closed and barred gates was a small office occupied by several men and large books. We all went in there, and when they began to ask me questions the doctor interposed and said he had all the papers, and that it was useless to ask me anything further, because I was unable to answer questions. This was a great relief to me, for my nerves were already feeling the strain. A rough looking man wanted to put me into the ambulance, but I ​refused his aid so decidedly that the doctor and policeman told him to desist, and they performed that gallant office themselves. I did not enter the ambulance without protest. I made the remark that I had never seen a carriage of that make before, and that I did not want to ride in it, but after awhile I let them persuade me, as I had right along intended to do.",
          },
          {
            h: 0,
            t: "I shall never forget that ride. After I was put in flat on the yellow blanket, the doctor got in and sat near the door. The large gates were swung open, and the curious crowd which had collected swayed back to make way for the ambulance as it backed out. How they tried to get a glimpse at the supposed crazy girl! The doctor saw that I did not like the people gazing at me, and considerately put down the curtains, after asking my wishes in regard to it. Still that did not keep the people away. The children raced after us, yelling all sorts of slang expressions, and trying to get a peep under the curtains. It was quite an interesting drive, but I must say that it was an excruciatingly rough one. I held on, only there was not much to hold on to, and the driver drove as if he feared some one would catch up with us.",
          },
        ],
        tpl: "tabloid",
        cols: 2,
        cut: "band",
        cap: "NEW YORK CITY ASYLUM FOR THE INSANE (WOMEN), BLACKWELL'S ISLAND.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/468_NEW-YORK_CITY_ASYLUM_FOR_THE_INSANE_%28WOMAN%29_BLACKWELL%27S_ISLAND.jpg/960px-468_NEW-YORK_CITY_ASYLUM_FOR_THE_INSANE_%28WOMAN%29_BLACKWELL%27S_ISLAND.jpg",
      },
      {
        paper: "The Morning Chronicle",
        date: "LONDON, 1836",
        by: "CHARLES DICKENS",
        head: ["A VISIT TO", "NEWGATE"],
        sub: "AN HOUR INSIDE THE CONDEMNED WARD OF THE CITY GAOL",
        body: [
          {
            h: 0,
            t: "\"The force of habit\" is a trite phrase in everybody's mouth; and it is not a little remarkable that those who use it most as applied to others, unconsciously afford in their own persons singular examples of the power which habit and custom exercise over the minds of men, and of the little reflection they are apt to bestow on subjects with which every day's experience has rendered them familiar. If Bedlam could be suddenly removed like another Aladdin's palace, and set down on the space now occupied by Newgate, scarcely one man out of a hundred, whose road to business every morning lies through Newgate-street, or the Old Bailey, would pass the building without bestowing a hasty glance on its small, grated windows, and a transient thought upon the condition ​of the unhappy beings immured in its dismal cells; and yet these same men, day by day, and hour by hour, pass and repass this gloomy depository of the guilt and misery of London, in one perpetual stream of life and bustle, utterly unmindful of the throng of wretched creatures pent up within it—nay not even knowing, or if they do, not heeding the fact, that as they pass one particular angle of the massive wall with a light laugh, or a merry whistle, they stand within one yard of a fellow-creature, bound and helpless, whose hours are numbered, from whom the last feeble ray of hope has fled for ever, and whose miserable career will shortly terminate in a violent and shameful death. Contact with death even in its least terrible shape is solemn and appalling. How much more awful is it to reflect on this near vicinity to the dying—to men in full health and vigour, in the flower of youth or the prime of life, with all their faculties and perceptions as acute and perfect as your own; but dying, nevertheless—dying as surely—with the hand of death imprinted upon them as indelibly—as if mortal disease had wasted their frames to shadows, and loathsome corruption had already begun!",
          },
          {
            h: 0,
            t: "​It was with some such thoughts as these, that we determined not many weeks since to visit the interior of Newgate—in an amateur capacity, of course; and, having carried our intention into effect, we proceed to lay its results before our readers, in the hope—founded more upon the nature of the subject than on any presumptuous confidence in our own descriptive powers—that this paper may not be found wholly devoid of interest. We have only to premise that we do not intend to fatigue the reader with any statistical accounts of the prison—they will be found at length in numerous reports of numerous committees, and a variety of authorities of equal weight. We took no notes, made no memoranda, measured none of the yards, ascertained the exact number of inches in no particular room—are unable even to report of how many apartments the jail is composed.",
          },
          {
            h: 0,
            t: "We saw the prison, and saw the prisoners; and what we did see, and what we thought, we will tell at once in our own way.",
          },
          {
            h: 0,
            t: "Having delivered our credentials to the servant who answered our knock at the door of the governor's house, we were ushered into the ​\"office\"—a little room, on the right-hand side as you enter, with two windows looking into the Old Bailey, fitted up like an ordinary attorney's office, or merchant's counting-house, with the usual fixtures—a wainscotted partition, a shelf or two, a desk, a couple of stools, a pair of clerks, an almanack, a clock, and a few maps. After a little delay, occasioned by sending into the interior of the prison for the officer whose duty it was to chaperon us, that functionary arrived—a respectable-looking man of about two or three and fifty, in a broad-brimmed hat, and full suit of black, who, but for his keys, would have looked quite as much like a clergyman as a turnkey; we were quite disappointed—he had not even top-boots on. Following our conductor by a door opposite to that at which we had entered, we arrived at a small room, without any other furniture than a little desk, with a book for visitors' autographs: and a shelf on which were a few boxes for papers, and casts of the heads and faces of the two notorious murderers, Bishop and Williams—the former, in particular, exhibiting a style of head and set of features which would have ​afforded sufficient moral grounds for his instant execution at any time, even had there been no other evidence against him. Leaving this room also by an opposite door, we found ourselves in the lodge which opens on the Old Bailey, one side of which is plentifully garnished with a choice collection of heavy sets of irons, including those worn by the redoubtable Jack Sheppard—genuine; and those said to have been graced by the sturdy limbs of the no less celebrated Dick Turpin—doubtful. From this lodge a heavy oaken gate, bound with iron, studded with nails of the same material, and guarded by another turnkey, opens on a few steps, if we remember right, which terminate in a narrow and dismal stone passage, running parallel with the Old Bailey, and leading to the different yards, through a number of tortuous and intricate windings, guarded in their turn by huge gates and gratings, whose appearance is sufficient to dispel at once the slightest hope of escape that any new comer may have entertained: and the very recollection of which, on eventually traversing the place again, involves one in a maze of confusion.",
          },
          {
            h: 0,
            t: "It is necessary to explain here, that the build ​ings in the prison—or in other words the different wards—form a square, of which the four sides abut respectively on the Old Bailey, the old college of Physicians (now forming a part of Newgate-market), the Sessions-house, and Newgate-street. The intermediate space is divided into several paved yards, in which the prisoners take such air and exercise as can be had in such a place. These yards, with the exception of that in which prisoners under sentence of death are confined (of which we shall presently give a more detailed description), run parallel with Newgate-street, and consequently from the Old Bailey, as it were, to Newgate-market. The women's side is in the right wing of the prison nearest the Sessions-house; and as we were introduced into this part of the building first, we will adopt the same order, and introduce our readers to it also.",
          },
          {
            h: 0,
            t: "Turning to the right, then, down the passage to which we just now adverted, omitting any mention of intervening gates;—for if we noticed every gate that was unlocked for us to pass through, and locked again as soon as we had passed, we should require a gate at every comma—we came to a door composed of thick bars ​of wood, through which were discernible, passing to and fro in a narrow yard, some twenty women, the majority of whom, however, as soon as they were, aware of the presence of strangers, retreated to their wards. One side of this yard is railed off at a considerable distance, and formed into a kind of iron cage, about five feet ten inches in height, roofed at the top, and defended in front by iron bars, from which the friends of the female prisoners communicate with them. In one corner of this singular-looking den was a yellow, haggard, decrepit old woman, in a tattered gown that had once been black, and the remains of an old straw bonnet, with faded ribbon of the same hue, in earnest conversation with a young girl—a prisoner of course—of about two-and-twenty. It is impossible to imagine a more poverty-stricken object, or a creature so borne down, soul and body, by excess of misery and destitution. The girl was a good-looking robust female, with a profusion of hair streaming about in the wind—for she had no bonnet on—and a man's silk pocket-handkerchief was loosely thrown over a most ample pair of shoulders. The old woman was talking in that low, stifled tone of voice which ​tells so forcibly of mental anguish; and every now and then burst into an irrepressible sharp, abrupt cry of grief, the most distressing sound that human ears can hear. The girl was perfectly unmoved. Hardened beyond all hope of redemption, she listened doggedly to her mother's entreaties, whatever they were: and, beyond inquiring after \"Jem,\" and eagerly catching at the few halfpence her miserable parent had brought her, took no more apparent interest in the conversation than the most unconcerned spectators. God knows, there were enough of them in the persons of the other prisoners in the yard, who were no more concerned by what was passing before their eyes, and within their hearing, than if they were blind and deaf. Why should they be? Inside the prison, and out, such scenes were too familiar to them, to excite even a passing thought, unless of ridicule or contempt, for the display of feelings which they had long since forgotten, and lost all sympathy for.",
          },
        ],
        tpl: "penny",
        cols: 5,
      },
      {
        paper: "Scribner's Magazine",
        date: "NEW YORK, 1890",
        by: "JACOB A. RIIS",
        head: ["HOW THE OTHER", "HALF LIVES"],
        sub: "GENESIS OF THE TENEMENT — A STUDY AMONG THE POOR",
        body: [
          { h: 1, t: "CHAPTER I: GENESIS OF THE TENEMENT" },
          {
            h: 0,
            t: 'The first tenement New York knew bore the mark of Cain from its birth, though a generation passed before the waiting was deciphered. It was the "rear house," infamous ever after in our city\'s history. There had been tenant-houses before, but they were not built for the purpose. Nothing would probably have shocked their original owners more than the idea of their harboring a promiscuous crowd; for they were the decorous homes of the old Knickerbockers, the proud aristocracy of Manhattan in the early days.',
          },
          {
            h: 0,
            t: 'It was the stir and bustle of trade, together with the tremendous immigration that followed upon the war of 1812 that dislodged them. In thirty-five years the city of less than a hundred thousand came to harbor half a million souls, for whom homes had to be found. Within the memory of men not yet in their prime, Washington had moved from his house on Cherry Hill as too far out of town to be easily reached. Now the old residents followed his example; but they moved in a different direction and for a different reason. Their comfortable dwellings in the once fashionable streets along the East River front fell into the hands of real-estate agents and boarding-house keepers; and here, says the report to the Legislature of 1857, when the evils engendered had excited just alarm, "in its beginning, the tenant-house became a real blessing to that class of industrious poor whose small earnings limited their expenses, and whose employment in workshops, stores, or about the warehouses and thoroughfares, render a near residence of much importance." Not for long, however. As business increased, and the city grew with rapid strides, the necessities of the poor became the opportunity of their wealthier neighbors, and the stamp was set upon the old houses, suddenly become valuable, which the best thought and effort of a later age has vainly struggled to efface. Their "large rooms were partitioned into several smaller ones, without regard to light or ventilation, the rate of rent being lower in proportion to space or height from the street; and they soon became filled from cellar to garret with a class of tenantry living from hand to mouth, loose in morals, improvident in habits, degraded, and squalid as beggary itself." It was thus the dark bedroom, prolific of untold depravities, came into the world. It was destined to survive the old houses. In their new role, says the old report, eloquent in its indignant denunciation of "evils more destructive than wars," "they were not intended to last. Rents were fixed high enough to cover damage and abuse from this class, from whom nothing was expected, and the most was made of them while they lasted. Neatness, order, cleanliness, were never dreamed of in connection with the tenant-house system, as it spread its localities from year to year; while redress slovenliness, discontent, privation, and ignorance were left to work out their invariable results, until the entire premises reached the level of tenant-house dilapidation, containing, but sheltering not, the miserable hordes that crowded beneath smouldering, water-rotted roofs or burrowed among the rats of clammy cellars." Yet so illogical is human greed that, at a later day, when called to account, "the proprietors frequently urged the filthy habits of the tenants as an excuse for the condition of their property, utterly losing sight of the fact that it was the tolerance of those habits which was the real evil, and that for this they themselves were alone responsible."',
          },
          {
            h: 0,
            t: 'Still the pressure of the crowds did not abate, and in the old garden where the stolid Dutch burgher grew his tulips or early cabbages a rear house was built, generally of wood, two stories high at first. Presently it was carried lop another story, and another. Where two families had lived ten moved in. The front house followed suit, if the brick walls were strong enough. The question was not always asked, judging from complaints made by a contemporary witness, that the old buildings were "often carried up to a great height without regard to the strength of the foundation walls." It was rent the owner was after; nothing was said in the contract about either the safety or the comfort of the tenants. The garden gate no longer swung on its rusty hinges. The shell-paved walk had become an alley; what the rear house had left of the garden, a "court" Plenty such are yet to be found in the Fourth Ward, with here and there one of the original rear tenements.',
          },
          {
            h: 0,
            t: 'Worse was to follow. It was "soon perceived by estate owners and agents of property that a greater percentage of profits could be realized by the conversion of houses and blocks into barracks, and dividing their space into smaller proportions capable of containing human life within four walls. . . . Blocks were rented of real estate owners, or \'purchased on time,\' or taken in charge at a percentage, and held for under-letting." With the appearance of the middleman, wholly irresponsible, and utterly reckless and unrestrained, began the era of tenement building which turned out such blocks as Gotham Court, where, in one cholera epidemic that scarcely touched the clean wards, the tenants died at the rate of one hundred and ninety-five to the thousand of population; which forced the general mortality of the city up front l in 41.83 in 1815, to 1 in 27.33 in 1855, a year of unusual freedom from epidemic disease, and which wrung from the early organizers of the Health Department this wail: "There are numerous examples of tenement-houses in which are lodged several hundred people that have a pro rata allotment of ground area scarcely equal to two-square yards upon the city lot, court-yards and all included." The tenement-house population had swelled to half a million souls by that time, and on the East Side, in what is still the most densely populated district in all the world, China not excluded, it was packed at the rate of 290,000 to the square mile, a state of affairs wholly unexampled. The utmost cupidity of other lands and other days had never contrived to herd much more than half that number within the same space. The greatest crowding of Old London was at the rate of 175,816. Swine roamed the streets and gutters as their principal scavengers. The death of a child in a tenement was registered at the Bureau of Vital Statistics as "plainly due to suffocation in the foul air of an unventilated apartment," and the Senators, who had come down from Albany to find out what was the matter with New York, reported that "there are annually cut off from the population by disease and death enough human beings to people a city, and enough human labor to sustain it." And yet experts had testified that, as compared with uptown, rents were from twenty-five to thirty per cent. higher in the worst slums of the lower wards, with such accommodations as were enjoyed, for instance, by a "family with boarders" in Cedar Street, who fed hogs in the Stellar that contained eight or ten loads of manure; or "one room 12 x 19 with five families living in it, comprising twenty persons of both sexes and all ages, with only two beds, without partition, screen, chair, or table." The rate of rent has been successfully maintained to the present day, though the hog at least has been eliminated.',
          },
        ],
        tpl: "illustrated",
        cols: 2,
        // no cut: this one runs as an essay, and the first rung needs it
        
        cap: "BANDIT'S ROOST, 59½ MULBERRY STREET. PHOTOGRAPH BY JACOB RIIS.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Bandits_Roost%2C_59_and_a_half_Mulberry_Street.jpg/960px-Bandits_Roost%2C_59_and_a_half_Mulberry_Street.jpg",
      },
      {
        paper: "The North Star",
        date: "ROCHESTER, 1852",
        by: "FREDERICK DOUGLASS",
        head: ["WHAT TO THE SLAVE", "IS THE FOURTH OF JULY?"],
        sub: "AN ADDRESS DELIVERED AT CORINTHIAN HALL",
        body: [
          {
            h: 0,
            t: "A speech by Frederick Douglass given on Monday, July 5, 1852 at Rochester, New York. The oration was published as the pamphlet Oration, Delivered in Corinthian Hall, Rochester by Frederick Douglass, July 5th, 1852 the same year. See also Masterpieces of Negro Eloquence. An annotated version of this text is available.",
          },
          {
            h: 0,
            t: "He who could address this audience without a quailing sensation, has stronger nerves than I have. I do not remember ever to have appeared as a speaker before any assembly more shrinkingly, nor with greater distrust of my ability, than I do this day. A feeling has crept over me, quite unfavorable to the exercise of my limited powers of speech. The task before me is one which requires much previous thought and study for its proper performance. I know that apologies of this sort are generally considered flat and unmeaning. I trust, however, that mine will not be so considered. Should I seem at ease, my appearance would much misrepresent me. The little experience I have had in addressing public meetings, in country school houses, avails me nothing on the present occasion.",
          },
          {
            h: 0,
            t: "The papers and placards say, that I am to deliver a 4th July oration. This certainly, sounds large, and out of the common way, for it is true that I have often had the privilege to speak in this beautiful Hall, and to address many who now honor me with their presence. But neither their familiar faces, nor the perfect gage I think I have of Corinthian Hall, seems to free me from embarrassment.",
          },
          {
            h: 0,
            t: "The fact is, ladies and gentlemen, the distance between this platform and the slave plantation, from which I escaped, is considerable—and the difficulties ​to be overcome in getting from the latter to the former, are by no means slight. That I am here to-day is, to me, a matter of astonishment as well as of gratitude. You will not, therefore, be surprised, if in what I have to say, I evince no elaborate preparation, nor grace my speech with any high sounding exordium. With little experience and with less learning, I have been able to throw my thoughts hastily and imperfectly together; and trusting to your patient and generous indulgence, I will proceed to lay them before you.",
          },
          {
            h: 0,
            t: "This, for the purpose of this celebration, is the 4th of July. It is the birthday of your National Independence, and of your political freedom. This, to you, is what the Passover was to the emancipated people of God. It carries your minds back to the day, and to the act of your great deliverance; and to the signs, and to the wonders, associated with that act, and that day. This celebration also marks the beginning of another year of your national life; and reminds you that the Republic of America is now 76 years old. I am glad, fellow-citizens, that your nation is so young. Seventy-six years, though a good old age for a man, is but a mere speck in the life of a nation. Three score years and ten is the allotted time for individual men; but nations number their years by thousands. According to this fact, you are, even now, only in the beginning of your national career, still lingering in the period of childhood. I repeat, I am glad this is so. There is hope in the thought, and hope is much needed, under the dark clouds which lower above the horizon. The eye of the reformer is met with angry flashes, portending disastrous times; but ​his heart may well beat lighter at the thought that America is young, and that she is still in the impressible stage of her existence. May he not hope that high lessons of wisdom, of justice and of truth, will yet give direction to her destiny? Were the nation older, the patriot's heart might be sadder, and the reformer's brow heavier. Its future might be shrouded in gloom, and the hope of its prophets go out in sorrow. There is consolation in the thought that America is young.—Great streams are not easily turned from channels, worn deep in the course of ages. They may sometimes rise in quiet and stately majesty, and inundate the land, refreshing and fertilizing the earth with their mysterious properties. They may also rise in wrath and fury, and bear away, on their angry waves, the accumulated wealth of years of toil and hardship. They, however, gradually flow back to the same old channel, and flow on as serenely as ever. But, while the river may not be turned aside, it may dry up, and leave nothing behind but the withered branch, and the unsightly rock, to howl in the abyss-sweeping wind, the sad tale of departed glory. As with rivers so with nations.",
          },
          {
            h: 0,
            t: "Fellow-citizens, I shall not presume to dwell at length on the associations that cluster about this day. The simple story of it is that, 76 years ago, the people of this country were British subjects. The style and title of your “sovereign people” (in which you now glory) was not then born. You were under the British Crown. Your fathers esteemed the English Government as the home government; and England as the fatherland. This home government, ​you know, although a considerable distance from your home, did, in the exercise of its parental prerogatives, impose upon its colonial children, such restraints, burdens and limitations, as, in its mature judgement, it deemed wise, right and proper.",
          },
          {
            h: 0,
            t: "But, your fathers, who had not adopted the fashionable idea of this day, of the infallibility of government, and the absolute character of its acts, presumed to differ from the home government in respect to the wisdom and the justice of some of those burdens and restraints. They went so far in their excitement as to pronounce the measures of government unjust, unreasonable, and oppressive, and altogether such as ought not to be quietly submitted to. I scarcely need say, fellow-citizens, that my opinion of those measures fully accords with that of your fathers. Such a declaration of agreement on my part would not be worth much to anybody. It would, certainly, prove nothing, as to what part I might have taken, had I lived during the great controversy of 1776. To say now that America was right, and England wrong, is exceedingly easy. Everybody can say it; the dastard, not less than the noble brave, can flippantly discant on the tyranny of England towards the American Colonies. It is fashionable to do so; but there was a time when to pronounce against England, and in favor of the cause of the colonies, tried men′s souls. They who did so were accounted in their day, plotters of mischief, agitators and rebels, dangerous men. To side with the right, against the wrong, with the weak against the strong, and with the oppressed against the oppressor! here lies the merit, and the one which, of all others, seems ​unfashionable in our day. The cause of liberty may be stabbed by the men who glory in the deeds of your fathers. But, to proceed.",
          },
          {
            h: 0,
            t: "Feeling themselves harshly and unjustly treated by the home government, your fathers, like men of honesty, and men of spirit, earnestly sought redress. They petitioned and remonstrated; they did so in a decorous, respectful, and loyal manner. Their conduct was wholly unexceptionable. This, however, did not answer the purpose. They saw themselves treated with sovereign indifference, coldness and scorn. Yet they persevered. They were not the men to look back.",
          },
          {
            h: 0,
            t: "As the sheet anchor takes a firmer hold, when the ship is tossed by the storm, so did the cause of your fathers grow stronger, as it breasted the chilling blasts of kingly displeasure. The greatest and best of British statesmen admitted its justice, and the loftiest eloquence of the British Senate came to its support. But, with that blindness which seems to be the unvarying characteristic of tyrants, since Pharaoh and his hosts were drowned in the Red Sea, the British Government persisted in the exactions complained of.",
          },
          {
            h: 0,
            t: "The madness of this course, we believe, is admitted now, even by England; but we fear the lesson is wholly lost on our present rulers.",
          },
          {
            h: 0,
            t: "Oppression makes a wise man mad. Your fathers were wise men, and if they did not go mad, they became restive under this treatment. They felt themselves the victims of grievous wrongs, wholly incurable in their colonial capacity. With brave men there is always a remedy for oppression. Just here, the idea of a total separation of the colonies from the crown was born! It was a startling idea, much more ​so, than we, at this distance of time, regard it. The timid and the prudent (as has been intimated) of that day, were, of course, shocked and alarmed by it.",
          },
          {
            h: 0,
            t: "Such people lived then, had lived before, and will, probably, ever have a place on this planet; and their course, in respect to any great change, (no matter how great the good to be attained, or the wrong to be redressed by it,) may be calculated with as much precision as can be the course of the stars. They hate all changes, but silver, gold and copper change! Of this sort of change they are always strongly in favor.",
          },
        ],
        tpl: "penny",
        cols: 4,
      },
      {
        paper: "The Masses",
        date: "PETROGRAD, 1917",
        by: "JOHN REED",
        head: ["TEN DAYS THAT", "SHOOK THE WORLD"],
        sub: "BACKGROUND TO THE RISING IN PETROGRAD",
        body: [
          {
            h: 0,
            t: "Toward the end of September, 1917, an alien Professor of Sociology visiting Russia came to see me in Petrograd. He had been informed by business men and intellectuals that the Revolution was slowing down. The Professor wrote an article about it, and then travelled around the country, visiting factory towns and peasant communities—where, to his astonishment, the Revolution seemed to be speeding up. Among the wage-earners and the land-working people it was common to hear talk of “all land to the peasants, all factories to the workers”. If the Professor had visited the front, he would have heard the whole Army talking Peace…",
          },
          {
            h: 0,
            t: "The Professor was puzzled, but he need not have been; both observations were correct. The property-owning classes were becoming more conservative, the masses of the people more radical.",
          },
          {
            h: 0,
            t: "There was a feeling among business men and the intelligentzia generally that the Revolution had gone quite far enough, and lasted too long; that things should settle down. This sentiment was shared by the dominant “moderate” Socialist groups, the oborontsi Mensheviki and Socialist Revolutionaries, who supported the Provisional Government of Kerensky.",
          },
          {
            h: 0,
            t: "The drama of Revolution has two acts; the destruction of the old régime and the creation of the new one. The first act has lasted long enough. Now it is time to go on to the second, and to play it as rapidly as possible. As a great revolutionist put it, “Let us hasten, friends, to terminate the Revolution. He who makes it last too long will not gather the fruits…”",
          },
          {
            h: 0,
            t: "Among the worker, soldier and peasant masses, however, there was a stubborn feeling that the “first act” was not yet played out. On the front the Army Committees were always running foul of officers who could not get used to treating their men like human beings; in the rear the Land Committees elected by the peasants were being jailed for trying to carry out Government regulations concerning the land; and the workmen in the factories were fighting black-lists and lockouts. Nay, furthermore, returning political exiles were being excluded from the country as “undesirable” citizens; and in some cases, men who returned from abroad to their villages were prosecuted and imprisoned for revolutionary acts committed in 1905.",
          },
          {
            h: 0,
            t: "To the multiform discontent of the people the “moderate” Socialists had one answer: Wait for the Constituent Assembly, which is to meet in December. But the masses were not satisfied with that. The Constituent Assembly was all well and good; but there were certain definite things for which the Russian Revolution had been made, and for which the revolutionary martyrs rotted in their stark Brotherhood Grave on Mars Field, that must be achieved Constituent Assembly or no Constituent Assembly: Peace, Land, and Workers’ Control of Industry. The Constituent Assembly had been postponed and postponed—would probably be postponed again, until the people were calm enough—perhaps to modify their ​demands! At any rate, here were eight months of the Revolution gone, and little enough to show for it…",
          },
          {
            h: 0,
            t: "Meanwhile the soldiers began to solve the peace question by simply deserting, the peasants burned manor-houses and took over the great estates, the workers sabotaged and struck… Of course, as was natural, the manufacturers, land-owners and army officers exerted all their influence against any democratic compromise…",
          },
          {
            h: 0,
            t: "The policy of the Provisional Government alternated between ineffective reforms and stern repressive measures. An edict from the Socialist Minister of Labour ordered all the Workers’ Committees henceforth to meet only after working-hours. Among the troops at the front, “agitators” of opposition political parties were arrested, radical newspapers closed down, and capital punishment applied—to revolutionary propagandists. Attempts were made to disarm the Red Guard. Cossacks were sent to keep order in the provinces…",
          },
          {
            h: 0,
            t: "These measures were supported by the “moderate” Socialists and their leaders in the Ministry, who considered it necessary to cooperate with the propertied classes. The people rapidly deserted them, and went over to the Bolsheviki, who stood for Peace, Land, and Workers’ Control of Industry, and a Government of the working-class. In September, 1917, matters reached a crisis. Against the overwhelming sentiment of the country, Kerensky and the “moderate” Socialists succeeded in establishing a Government of Coalition with the propertied classes; and as a result, the Mensheviki and Socialist Revolutionaries lost the confidence of the people forever.",
          },
          {
            h: 0,
            t: "An article in Rabotchi Put (Workers’ Way) about the middle of October, entitled “The Socialist Ministers”, expressed the feeling of the masses of the people against the “moderate” Socialists:",
          },
          {
            h: 0,
            t: "Tseretelli: disarmed the workmen with the assistance of Gen​eral Polovtsev, checkmated the revolutionary soldiers, and approved of capital punishment in the army.",
          },
          {
            h: 0,
            t: "Skobeliev: commenced by trying to tax the capitalists 100% of their profits, and finished—and finished by an attempt to dissolve the Workers’ Committees in the shops and factories.",
          },
          {
            h: 0,
            t: "Avksentiev: put several hundred peasants in prison, members of the Land Committees, and suppressed dozens of workers’ and soldiers’ newspapers.",
          },
          {
            h: 0,
            t: "Savinkov: concluded an open alliance with General Kornilov. If this saviour of the country was not able to betray Petrograd, it was due to reasons over which he had no control.",
          },
          {
            h: 0,
            t: "Zarudny: with the sanction of Alexinsky and Kerensky, put some of the best workers of the Revolution, soldiers and sailors, in prison.",
          },
          {
            h: 0,
            t: "A Congress of delegates of the Baltic Fleet, at Helsingfors, passed a resolution which began as follows:",
          },
          {
            h: 0,
            t: "We demand the immediate removal from the ranks of the Provisional Government of the “Socialist”, the political adventurer—Kerensky, as one who is scandalising and ruining the great Revolution, and with it the revolutionary masses, by his shameless political blackmail on behalf of the bourgeoisie…",
          },
          {
            h: 0,
            t: "They hurled the Miliukov Ministry down; it was their Soviet which proclaimed to the world the Russian peace terms—“No annexations, no indemnities, and the right of self-determination of peoples”; and again, in July, it was the spontaneous rising of the unorganised proletariat which once more stormed the Tauride Palace, to demand that the Soviets take over the Government of Russia.",
          },
          {
            h: 0,
            t: "The Bolsheviki, then a small political sect, put themselves at the head of the movement. As a result of the disastrous failure of the rising, public opinion turned against them, and their leaderless hordes slunk back into the Viborg Quarter, which is Petrograd’s St. Antoine. Then followed a savage hunt of the Bolsheviki; hundreds were imprisoned, among them Trotzky, Madame Kollontai and Kameniev; Lenin and Zinoviev went into hiding, fugitives from justice; the Bolshevik papers were suppressed. Provocators and reactionaries raised the cry that the Bolsheviki were German agents, until people all over the world believed it.",
          },
          {
            h: 0,
            t: "But the Provisional Government found itself unable to substantiate its accusations; the documents proving pro-German conspiracy were discovered to be forgeries ; and one by one the Bolsheviki were released from prison without trial, on nominal or no bail—until only six remained. The impotence and indecision of the ever-changing Provisional Government was an argument nobody could refute. The Bolsheviki raised again the slogan so dear to the masses, “All Power to the Soviets!”—and they were not merely self-seeking, for at that time the majority of the Soviets was “moderate” Socialist, their bitter enemy.",
          },
          {
            h: 0,
            t: "But more potent still, they took the crude, simple desires of the workers, soldiers and peasants, and from them built their immediate programme. And so, while the oborontsi Mensheviki and Socialist Revolutionaries involved themselves in ​compromise with the bourgeoisie, the Bolsheviki rapidly captured the Russian masses. In July they were hunted and despised; by September the metropolitan workmen, the sailors of the Baltic Fleet, and the soldiers, had been won almost entirely to their cause. The September municipal elections in the large cities ) were significant; only 18 per cent of the returns were Menshevik and Socialist Revolutionary, against more than 70 per cent in June…",
          },
        ],
        tpl: "review",
        cols: 2,
      },
      {
        paper: "The Sun",
        date: "NEW YORK, 1835",
        by: "RICHARD ADAMS LOCKE",
        head: ["GREAT ASTRONOMICAL", "DISCOVERIES"],
        sub: "LATELY MADE BY SIR JOHN HERSCHEL AT THE CAPE OF GOOD HOPE",
        body: [
          {
            h: 0,
            t: "FIRST PUBLISHED IN THE NEW YORK SUN IN AUGUST AND SEPTEMBER, 1835, FROM THE SUPPLEMENT TO THE EDINBURGH JOURNAL OF SCIENCE.",
          },
          {
            h: 0,
            t: "In this unusual addition to our Journal, we have the happiness of making known to the British public, and thence to the whole civilized world, recent discoveries in Astronomy which will build an imperishable monument to the age in which we live, and confer upon the present generation of the human race a proud distinction through all future time. It has been poetically said, that the stars of heaven are the hereditary regalia of man, as the intellectual sovereign of the animal creation. He may now fold the Zodiack around him with a loftier consciousness of his mental supremacy.",
          },
          {
            h: 0,
            t: 'It is impossible to contemplate any great Astronomical discovery without feelings closely allied to a sensation of awe, and nearly akin to those with which a departed spirit may be supposed to discover the realities of a future state. Bound by the irrevocable laws of nature to the globe on which we live, creatures "close shut up in infinite expanse," it seems like acquiring a fearful supernatural power when any remote mysterious works of the Creator yield tribute to our curiosity. It seems ​almost a presumptuous usurpation of powers denied us by the divine will, when man, in the pride and confidence of his skill, steps forth, far beyond the apparently natural boundary of his privileges, and demands the secrets and familiar fellowship of other worlds. We are assured that when the immortal philosopher to whom mankind is indebted for the thrilling wonders now first made known, had at length adjusted his new and stupendous apparatus with a certainty of success, he solemnly paused several hours before he commenced his observations, that he might prepare his own mind for discoveries which he knew would fill the minds of myriads of his fellow-men with astonishment, and secure his name a bright, if not transcendant conjunction with that of his venerable father to all posterity. And well might he pause! From the hour the first human pair opened their eyes to the glories of the blue firmament above them, there has been no accession to human knowledge at all comparable in sublime interest to that which he has been the honored agent in supplying; and we are taught to believe that, when a work, already preparing for the press, in which his discoveries are embodied in detail, shall be laid before the public, they will be found of incomparable importance to some of the grandest operations of civilized life. Well might he pause! He was about to become the sole depository of wondrous secrets which had been hid from the eyes of all men that had lived since the birth of time. He was about to crown himself with a diadem of knowledge which would give him a conscious pre-eminence above every individual of his species who then lived, or who had lived in the generations that are passed away. He paused ere he broke the seal of the casket which contained it.',
          },
          {
            h: 0,
            t: "To render our enthusiasm intelligible, we will state at once, that by means of a telescope of vast dimensions and an entirely new principle, the younger Herschel, at his observatory in the Southern Hemisphere, has already made the most extraordinary discoveries in every planet of our solar system; has discovered planets in other solar systems; has obtained a distinct view of objects in the moon, fully equal to that which the unaided eye commands of terrestrial objects at the distance of ​a hundred yards; has affirmatively settled the question whether this satellite be inhabited, and by what order of beings; has firmly established a new theory of cometary phenomena; and has solved or corrected nearly every leading problem of mathematical astronomy.",
          },
          {
            h: 0,
            t: "For our early and almost exclusive information concerning these facts, we are indebted to the devoted friendship of Dr. Andrew Grant, the pupil of the elder, and for several years past the inseperable coadjutor of the younger Herschel. The amanuensis of the latter at the Cape of Good Hope, and the indefatigable superintendent of his telescope during the whole period of its construction and operation, Dr. Grant has been enabled to supply us with intelligence equal, in general interest at least, to that which Dr. Herschel himself has transmitted to the Royal Society. Indeed our correspondent assures us that the voluminous documents now before a committee of that institution contain little more than details and mathematical illustrations of the facts communicated to us in his own ample correspondence. For permission to indulge his friendship in communicating this invaluable information to us, Dr. Grant and ourselves are indebted to the magnanimity of Dr. Herschel, who, far above all mercenary considerations, has thus signally honored and rewarded his fellow-laborer in the field of science. The engravings of lunar animals and other objects, and of the phases of the several planets, are accurate copies of drawings taken in the observatory by Herbert Home, Esq., who accompanied the last powerful series of reflectors from London to the Cape, and superintended their erection; and he has thus recorded the proofs of their triumphant success. The engravings of the belts of Jupiter is a reduced copy of an imperial folio drawing by Dr. Herschel himself, and contains the results of his latest observation of that planet. The segment of the inner ring of Saturn is from a large drawing by Dr. Grant.",
          },
          {
            h: 0,
            t: "We first avail ourselves of the documents which contain a description and history of the instrument by which these stupendous discoveries have been made. A knowledge of the one is essential to the credibility of the other.",
          },
        ],
        tpl: "penny",
        cols: 6,
      },
      {
        paper: "The Atlantic Monthly",
        date: "ATLANTA, 1903",
        by: "W. E. B. DU BOIS",
        head: ["OF OUR SPIRITUAL", "STRIVINGS"],
        sub: "FROM THE SOULS OF BLACK FOLK",
        body: [
          {
            h: 0,
            t: "O water, voice of my heart, crying in the sand, All night long crying with a mournful cry, As I lie and listen, and cannot understand The voice of my heart in my side or the voice of the sea, O water, crying for rest, is it I, is it I? All night long the water is crying to me. Unresting water, there shall never be rest Till the last moon droop and the last tide fail, And the fire of the end begin to burn in the west; And the heart shall be weary and wonder and cry like the sea, All life long crying without avail, As the water all night long is crying to me.",
          },
          {
            h: 0,
            t: "BETWEEN me and the other world there is ever an unasked question: unasked by some through feelings of delicacy; by others through the difficulty of rightly framing it. All, nevertheless, flutter round it. They approach me in a half-hesitant sort of way, eye me curiously or compassionately, and then, instead of saying directly, How does it feel to be a problem? they say, I know an excellent ​colored man in my town; or, I fought at Mechanicsville; or, Do not these Southern outrages make your blood boil? At these I smile, or am interested, or reduce the boiling to a simmer, as the occasion may require. To the real question, How does it feel to be a problem? I answer seldom a word.",
          },
          {
            h: 0,
            t: "And yet, being a problem is a strange experience,—peculiar even for one who has never been anything else, save perhaps in babyhood and in Europe. It is in the early days of rollicking boyhood that the revelation first bursts upon one, all in a day, as it were. I remember well when the shadow swept across me. I was a little thing, away up in the hills of New England, where the dark Housatonic winds between Hoosac and Taghkanic to the sea. In a wee wooden schoolhouse, something put it into the boys' and girls' heads to buy gorgeous visiting-cards—ten cents a package—and exchange. The exchange was merry, till one girl, a tall newcomer, refused my card,—refused it peremptorily, with a glance. Then it dawned upon me with a certain suddenness that I was different from the others; or like, mayhap, in heart and life and longing, but shut out from their worn by a vast veil. I had thereafter no desire to tear down that veil, to creep through; I held all beyond it in common contempt, and lived above it in a region of blue sky and great wandering shadows. That sky was bluest when I could beat my mates at examination-time, or beat them at a foot-race, or even beat their stringy heads. Alas, with the years all this fine contempt began to fade; for the worlds I longed for, and all their dazzling opportunities, were ​theirs, not mine. But they should not keep these prizes, I said; some, all, I would wrest from them. Just how I would do it I could never decide: by reading law, by healing the sick, by telling the wonderful tales that swam in my head,—some way. With other black boys the strife was not so fiercely sunny: their youth shrunk into tasteless sycophancy, or into silent hatred of the pale world about them and mocking distrust of everything white; or wasted itself in a bitter cry. Why did God make me an outcast and a stranger in mine own house? The shades of the prison-house closed round about us all: walls strait and stubborn to the whitest, but relentlessly narrow, tall, and unscalable to sons of night who must plod darkly on in resignation, or beat unavailing palms against the stone, or steadily, half hopelessly, watch the streak of blue above.",
          },
          {
            h: 0,
            t: "After the Egyptian and Indian, the Greek and Roman, the Teuton and Mongolian, the Negro is a sort of seventh son, born with a veil, and gifted with second-sight in this American world,—a world which yields him no true self-consciousness, but only lets him see himself through the revelation of the other world. It is a peculiar sensation, this double-consciousness, this sense of always looking at one's self through the eyes of others, of measuring one's soul by the tape of a world that looks on in amused contempt and pity. One ever feels his two-ness,—an American, a Negro; two souls, two thoughts, two unreconciled strivings; two warring ideals in one dark body, whose dogged strength alone keeps it from being torn asunder.",
          },
          {
            h: 0,
            t: "​The history of the American Negro is the history of this strife,—this longing to attain self-conscious manhood, to merge his double self into a better and truer self. In this merging he wishes neither of the older selves to be lost. He would not Africanize America, for America has too much to teach the world and Africa. He would not bleach his Negro soul in a flood of white Americanism, for he knows that Negro blood has a message for the world. He simply wishes to make it possible for a man to be both a Negro and an American, without being cursed and spit upon by his fellows, without having the doors of Opportunity closed roughly in his face.",
          },
          {
            h: 0,
            t: "This, then, is the end of his striving: to be a co-worker in the kingdom of culture, to escape both death and isolation, to husband and use his best powers and his latent genius. These powers of body and mind have in the past been strangely wasted, dispersed, or forgotten. The shadow of a mighty Negro past flits through the tale of Ethiopia the Shadowy and of Egypt the Sphinx. Throughout history, the powers of single black men flash here and there like falling stars, and die sometimes before the world has rightly gauged their brightness. Here in America, in the few days since Emancipation, the black man's turning hither and thither in hesitant and doubtful striving has often made his very strength to lose effectiveness, to seem like absence of power, like weakness. And yet it is not weakness,—it is the contradiction of double aims. The double-aimed struggle of the black artisan—on the one hand to escape white contempt for a nation of mere hewers of wood and drawers ​of water, and on the other hand to plough and nail and dig for a poverty-stricken horde—could only result in making him a poor craftsman, for he had but half a heart in either cause. By the poverty and ignorance of his people, the Negro minister or doctor was tempted toward quackery and demagogy; and by the criticism of the other world, toward ideals that made him ashamed of his lowly tasks. The would-be black savant was confronted by the paradox that the knowledge his people needed was a twice-told tale to his white neighbors, while the knowledge which would teach the white world was Greek to his own flesh and blood. The innate love of harmony and beauty that set the ruder souls of his people a-dancing and a-singing raised but confusion and doubt in the soul of the black artist; for the beauty revealed to him was the soul-beauty of a race which his larger audience despised, and he could not articulate the message of another people. This waste of double aims, this seeking to satisfy two unreconciled ideals, has wrought sad havoc with the courage and faith and deeds of ten thousand thousand people,—has sent them often wooing false gods and invoking false means of salvation, and at times has even seemed about to make them ashamed of themselves.",
          },
          {
            h: 0,
            t: "Away back in the days of bondage they thought to see in one divine event the end of all doubt and disappointment; few men ever worshipped Freedom with half such unquestioning faith as did the American Negro for two centuries. To him, so far as he thought and dreamed, slavery was indeed the sum of all villainies, the cause all sorrow, the root of all ​prejudice; Emancipation was the key to a promised land of sweeter beauty than ever stretched before the eyes of wearied Israelites. In song and exhortation swelled one refrain—Liberty; in his tears and curses the God he implored had Freedom in his right hand. At last it came,—suddenly, fearfully, like a dream. With one wild carnival of blood and passion came the message in his own plaintive cadences:—",
          },
          {
            h: 0,
            t: "Years have passed away since then,—ten, twenty, forty; forty years of national life, forty years of renewal and development, and yet the swarthy spectre sits in its accustomed seat at the Nation's feast. In vain do we cry to this our vastest social problem:—",
          },
          {
            h: 0,
            t: "The Nation has not yet found peace from its sins; the freedman has not yet found in freedom his promised land. Whatever of good may have come in these years of change, the shadow of a deep disappointment rests upon the Negro people,—a disappointment all the more bitter because the unattained ideal was unbounded save by the simple ignorance of a lowly people.",
          },
        ],
        tpl: "monthly",
        cols: 1,
      },
      {
        paper: "The Pall Mall Gazette",
        date: "LONDON, 1885",
        by: "W. T. STEAD",
        head: ["THE MAIDEN TRIBUTE", "OF MODERN BABYLON"],
        sub: "THE REPORT OF OUR SECRET COMMISSION",
        body: [
          { h: 1, t: "PART I (JULY 6)" },
          {
            h: 0,
            t: "In ancient times, if we may believe the myths of Hellas, Athens, after a disastrous campaign, was compelled by her conqueror to send once every nine years a tribute to Crete of seven youths and seven maidens. The doomed fourteen, who were selected by lot amid the lamentations of the citizens, returned no more. The vessel that bore them to Crete unfurled black sails as the symbol of despair, and on arrival her passengers were flung into the famous Labyrinth of Daedalus, there to wander about blindly until such time as they were devoured by the Minotaur, a frightful monster, half man, half bull, the foul product of an unnatural lust.",
          },
          {
            h: 0,
            t: "\"The labyrinth was as large as a town and had countless courts and galleries. Those who entered it could never find their way out again. If they hurried from one to another of the numberless rooms looking for the entrance door, it was all in vain. They only became more hopelessly lost in the bewildering labyrinth, until at last they were devoured by the Minotaur.\" Twice at each ninth year the Athenians paid the maiden tribute to King Minos, lamenting sorely the dire necessity of bowing to his iron law. When the third tribute came to be exacted, the distress of the city of the Violet Crown was insupportable. From the King's palace to the peasant's hamlet, everywhere were heard cries and groans and the choking sob of despair, until the whole air seemed to vibrate with the sorrow of an unutterable anguish. Then it was that the hero Theseus volunteered to be offered up among those who drew the black balls from the brazen urn of destiny, and the story of his self-sacrifice, his victory, and his triumphant return, is among the most familiar of the tales which since the childhood of the world have kindled the imagination and fired the heart of the human race.",
          },
          {
            h: 0,
            t: "The labyrinth was cunningly wrought like a house; says Ovid, with many rooms and winding passages, that so the shameful creature of lust whose abode it was to be should be far removed from sight.",
          },
          {
            h: 0,
            t: 'And what happened to the victims—the young men and maidens—who were there interned, no one could surely tell. Some say that they were done to death; others that they lived in servile employments to old age. But in this alone do all the stories agree, that those who were once caught in the coils could never retrace their steps, so "inextricable" were the paths, so "blind" the footsteps, so "innumerable" the ways of wrong-doing. On the southern wall of the porch of the cathedral at Lucca there is a slightly traced piece of sculpture, representing the Cretan labyrinth, "out of which," says the legend written in straggling letters at the side, "nobody could get who was inside":—',
          },
          {
            h: 0,
            t: "The fact that the Athenians should have taken so bitterly to heart the paltry maiden tribute that once in nine years they had to pay to the Minotaur seems incredible, almost inconceivable. This very night in London, and every night, year in and year out, not seven maidens only, but many times seven, selected almost as much by chance as those who in the Athenian market-place drew lots as to which should be flung into the Cretan labyrinth, will be offered up as the Maiden Tribute of Modern Babylon. Maidens they were when this morning dawned, but to-night their ruin will be accomplished, and to-morrow they will find themselves within the portals of the maze of London brotheldom. Within that labyrinth wander, like lost souls, the vast host of London prostitutes, whose numbers no man can compute, but who are probably not much below 50,000 strong. Many, no doubt, who venture but a little way within the maze make their escape. But multitudes are swept irresistibly on and on to be destroyed in due season, to give place to others, who also will share their doom.",
          },
          {
            h: 0,
            t: "The maw of the London Minotaur is insatiable, and none that go into the secret recesses of his lair return again. After some years' dolorous wandering in this palace of despair—for \"hope of rest to solace there is none, nor e'en of milder pang,\" save the poisonous anodyne of drink—most of those ensnared to-night will perish, some of them in horrible torture. Yet, so far from this great city being convulsed with woe, London cares for none of these things, and the cultured man of the world, the heir of all the ages, the ultimate product of a long series of civilizations and religions, will shrug his shoulders in scorn at the folly of any one who ventures in public print to raise even the mildest protest against a horror a thousand times more horrible than that which, in the youth of the world, haunted like a nightmare the imagination of mankind. Nevertheless, I have not yet lost faith in the heart and conscience of the English folk, the sturdy innate chivalry and right thinking of our common people; and although I am no vain dreamer of Utopias peopled solely by Sir Galahads and vestal virgins, I am not without hope that there may be some check placed upon this vast tribute of maidens, unwitting or unwilling, which is nightly levied in London by the vices of the rich upon the necessities of the poor.",
          },
          {
            h: 0,
            t: 'London\'s lust annually uses up many thousands of women, who are literally killed and made away with—living sacrifices slain in the service of vice. That may be inevitable, and with that I have nothing to do. But I do ask that those doomed to the house of evil fame shall not be trapped into it unwillingly, and that none shall be beguiled into the chamber of death before they are of an age to read the inscription above the portal—"All hope abandon ye who enter here." If the daughters of the people must be served up as dainty morsels to minister to the passions of the rich, let them at least attain an age when they can understand the nature of the sacrifice which they are asked to make. And if we must cast maidens—not seven, but seven times seven— nightly into the jaws of vice, let us at least see to it that they assent to their own immolation, and are not unwilling sacrifices procured by force and fraud.',
          },
          {
            h: 0,
            t: "That is surely not too much to ask from the dissolute rich. Even considerations of self-interest might lead our rulers to assent to so modest a demand. For the hour of Democracy has struck, and there is no wrong which a man resents like this. If it has not been resented hitherto, it is not because it was not felt. The Roman Republic was founded by the rape of Lucrece, but Lucrece was a member of one of the governing families. A similar offence placed Spain under the domination of the Moors, but there again the victim of Royal licence was the daughter of a Count. But the fathers and brothers whose daughters and sisters are purchased like slaves, not for labour, but for lust, are now at last enrolled among the governing classes—a circumstance full of hope for the nation, but by no means without menace for a class. Many of the French Revolutionists were dissolute enough, but nothing gave such an edge to the guillotine as the memory of the Pare aux Cerfs; and even in our time the horrors that attended the suppression of the Commune were largely due to the despair of the femme vengeresse. Hence, unless the levying of the maiden-tribute in London is shorn of its worst abuses—at present, as I shall show, flourishing unchecked—resentment, which might be appeased by reform, may hereafter be the virus of a social revolution. It is the one explosive which is strong enough to wreck the Throne.",
          },
          { h: 1, t: "LIBERTY FOR VICE, REPRESSION FOR CRIME" },
          {
            h: 0,
            t: "To avoid all misapprehension as to the object with which I propose to set forth the ghastly and criminal features of this infernal traffic, I wish to say emphatically at the outset that, however strongly I may feel as to the imperative importance of morality and chastity, I do not ask for any police interference with the liberty of vice. I ask only for the repression of crime. Sexual immorality, however evil it may be in itself or in its consequences, must be dealt with not by the policeman but by the teacher, so long as the persons contracting are of full age, are perfectly free agents, and in their sin are guilty of no outrage on public morals. Let us by all means apply the sacred principles of free trade to trade in vice, and regulate the relations of the sexes by the higgling of the market and the liberty of private contract. Whatever may be my belief as to the reality and the importance of a transcendental theory of purity in the relations between man and woman, that is an affair for the moralist, not for the legislator.",
          },
        ],
        tpl: "rail",
        cols: 4,
        cut: "left",
        cap: "WENTWORTH STREET, WHITECHAPEL. ENGRAVING BY GUSTAVE DORÉ, 1872.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Gustave_Dor%C3%A9_-_Wentworth_Street_Whitechapel_-_London%2C_a_Pilgrimage.jpg/960px-Gustave_Dor%C3%A9_-_Wentworth_Street_Whitechapel_-_London%2C_a_Pilgrimage.jpg",
      },
      {
        paper: "McClure's Magazine",
        date: "ST. LOUIS, 1902",
        by: "LINCOLN STEFFENS",
        head: ["TWEED DAYS IN", "ST. LOUIS"],
        sub: "HOW THE CITY WAS RUN, AND BY WHOM",
        body: [
          {
            h: 0,
            t: "St. Louis, the fourth city in size in the United States, is making two announcements to the world: one that it is the worst-governed city in the land; the other that it wishes all men to come there (for the World’s Fair) and see it. It isn’t our worst-governed city; Philadelphia is that. But St. Louis is worth examining while we have it inside out.",
          },
          {
            h: 0,
            t: "There is a man at work there, one man, working all alone, but he is the Circuit (district or State) Attorney, and he is “doing his duty.” That is what thousands of district attorneys and other public officials have promised to do and boasted of doing. This man has a literal sort of mind. He is a thin-lipped, firm-mouthed, dark little man, who never raises his voice, but goes ahead doing, with a smiling eye and a set jaw, the simple thing he said he would do. The politicians and reputable citizens who asked him to run urged him when he declined. When he said that if elected he would have to do his duty, they said, “Of course.” So he ran, they supported ​him, and he was elected. Now some of these politicians are sentenced to the penitentiary, some are in Mexico. The Circuit Attorney, finding that his “duty” was to catch and convict criminals, and that the biggest criminals were some of these same politicians and leading citizens, went after them. It is magnificent, but the politicians declare it isn’t politics.",
          },
          {
            h: 0,
            t: "The corruption of St. Louis came from the top. The best citizens—the merchants and big financiers—used to rule the town, and they ruled it well. They set out to outstrip Chicago. The commercial and industrial war between these two cities was at one time a picturesque and dramatic spectacle such as is witnessed only in our country. Business men were not mere merchants and the politicians were not mere grafters; the two kinds of citizens got together and wielded the power of banks, railroads, factories, the prestige of the city, and the spirit of its citizens to gain business and population. And it was a close race. Chicago, having the start, always led, but St. Louis had pluck, intelligence, and tremendous energy. It pressed Chicago hard. It excelled in a sense of civic beauty and good government; and there are those who think yet it might have won. But a change occurred. Public spirit became private spirit, public enterprise became private greed.",
          },
          {
            h: 0,
            t: "​Along about 1890, public franchises and privileges were sought, not only for legitimate profit and common convenience, but for loot. Taking but slight and always selfish interest in the public councils, the big men misused politics. The riffraff, catching the smell of corruption, rushed into the Municipal Assembly, drove out the remaining respectable men, and sold the city—its streets, its wharves, its markets, and all that it had—to the now greedy business men and bribers. In other words, when the leading men began to devour their own city, the herd rushed into the trough and fed also.",
          },
          {
            h: 0,
            t: "So gradually has this occurred that these same citizens hardly realize it. Go to St. Louis and you will find the habit of civic pride in them; they still boast. The visitor is told of the wealth of the residents, of the financial strength of the banks, and of the growing importance of the industries, yet he sees poorly paved, refuse-burdened streets, and dusty or mud-covered alleys; he passes a ramshackle fire-trap crowded with the sick, and learns that it is the City Hospital; he enters the “Four Courts,” and his nostrils are greeted by the odor of formaldehyde used as a disinfectant, and insect powder spread to destroy vermin; he calls at the new City Hall, and finds half the entrance boarded with pine planks to cover up the ​interior. Finally, he turns a tap in the hotel, to see liquid mud flow into wash-basin or bath-tub.",
          },
          {
            h: 0,
            t: "The St. Louis charter vests legislative power of great scope in a Municipal Assembly, which is composed of a council and a House of Delegates. Here is a description of the latter by one of Mr. Folk’s grand juries:",
          },
          {
            h: 0,
            t: "“We have had before us many of those who have been, and most of those who are now, members of the House of Delegates. We found a number of these utterly illiterate and lacking in ordinary intelligence, unable to give a better reason for favoring or opposing a measure than a desire to act with the majority. In some, no trace of mentality or morality could be found; in others, a low order of training appeared, united with base cunning, groveling instincts, and sordid desires. Unqualified to respond to the ordinary requirements of life, they are utterly incapable of comprehending the significance of an ordinance, and are incapacitated, both by nature and training, to be the makers of laws. The choosing of such men to be legislators makes a travesty of justice, sets a premium on incompetency, and deliberately poisons the very source of the law.”",
          },
          {
            h: 0,
            t: "These creatures were well organized. They had 33a “ ​combine”—legislative institution—which the grand jury described as follows:",
          },
          {
            h: 0,
            t: "“Our investigation, covering more or less fully a period of ten years, shows that, with few exceptions, no ordinance has been passed wherein valuable privileges or franchises are granted until those interested have paid the legislators the money demanded for action in the particular case. Combines in both branches of the Municipal Assembly are formed by members sufficient in number to control legislation. To one member of this combine is delegated the authority to act for the combine, and to receive and to distribute to each member the money agreed upon as the price of his vote in support of, or opposition to, a pending measure. So long has this practice existed that such members have come to regard the receipt of money for action on pending measures as a legitimate perquisite of a legislator.”",
          },
          {
            h: 0,
            t: "One legislator consulted a lawyer with the intention of suing a firm to recover an unpaid balance on a fee for the grant of a switch-way. Such difficulties rarely occurred, however. In order to insure a regular and indisputable revenue, the combine of each house drew up a schedule of bribery prices for all possible sorts of grants, just such a list as a commercial traveler takes out on the road with him. There was a price for a grain 34elevator, ​a price for a short switch; side tracks were charged for by the linear foot, but at rates which varied according to the nature of the ground taken; a street improvement cost so much; wharf space was classified and precisely rated. As there was a scale for favorable legislation, so there was one for defeating bills. It made a difference in the price if there was opposition, and it made a difference whether the privilege asked was legitimate or not. But nothing was passed free of charge. Many of the legislators were saloon-keepers—it was in St. Louis that a practical joker nearly emptied the House of Delegates by tipping a boy to rush into a session and call out, “Mister, your saloon is on fire,”—but even the saloon-keepers of a neighborhood had to pay to keep in their inconvenient locality a market which public interest would have moved.",
          },
          {
            h: 0,
            t: "From the Assembly, bribery spread into other departments. Men empowered to issue peddlers’ licenses and permits to citizens who wished to erect awnings or use a portion of the sidewalk for storage purposes charged an amount in excess of the prices stipulated by law, and pocketed the difference. The city’s money was loaned at interest, and the interest was converted into private bank accounts. City carriages were used by the wives and children of city officials. Supplies for public 35institutions ​found their way to private tables; one itemized account of food furnished the poorhouse included California jellies, imported cheeses, and French wines! A member of the Assembly caused the incorporation of a grocery company, with his sons and daughters the ostensible stockholders, and succeeded in having his bid for city supplies accepted although the figures were in excess of his competitors’. In return for the favor thus shown, he indorsed a measure to award the contract for city printing to another member, and these two voted aye on a bill granting to a third the exclusive right to furnish city dispensaries with drugs.",
          },
          {
            h: 0,
            t: "Men ran into debt to the extent of thousands of dollars for the sake of election to either branch of the Assembly. One night, on a street car going to the City Hall, a new member remarked that the nickel he handed the conductor was his last. The next day he deposited $5,000 in a savings bank. A member of the House of Delegates admitted to the Grand Jury that his dividends from the combine netted $25,000 in one year; a Councilman stated that he was paid $50,000 for his vote on a single measure.",
          },
          {
            h: 0,
            t: "Bribery was a joke. A newspaper reporter overheard this conversation one evening in the corridor of the City Hall: ​",
          },
          {
            h: 0,
            t: "“Stay there, my grafter!” replied Mr. Councilman. “Can you lend me a hundred for a day or two?”",
          },
        ],
        tpl: "pictorial",
        cols: 3,
        cut: "left",
        cap: "THE MUNICIPAL COURTS BUILDING, ST. LOUIS.",
        img: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Municipal_Courts_Building_%28NBY_433708%29.jpg",
      },
      {
        paper: "The San Francisco Examiner",
        date: "CALIFORNIA, 1898",
        by: "AMBROSE BIERCE",
        head: ["A LITTLE OF", "CHICKAMAUGA"],
        sub: "WHAT ONE SOLDIER SAW OF THE BATTLE",
        body: [
          {
            h: 0,
            t: "The history of that awful struggle is well known—I have not the intention to record it here, but only to relate some part of what I saw of it; my purpose not instruction, but entertainment.",
          },
          {
            h: 0,
            t: "I was an officer of the staff of a Federal brigade. Chickamauga was not my first battle by many, for although hardly more than a boy in years, I had served at the front from the beginning of the trouble, and had seen enough of war to give me a fair understanding of it. We knew well enough that there was to be a fight: the fact that we did not want one would have told us that, for Bragg always retired when we wanted to fight and fought when we most desired peace. We had maneuvered him out of Chattanooga, but had not maneuvered our entire army into it, and he fell back so sullenly that those of us who followed, keeping him actually in sight, were a good deal more concerned about effecting a junction with the rest of our army than to push the pursuit. By the time that Rosecrans had got his three scattered corps together we were a long way from Chattanooga, with our line of communication with it so exposed that Bragg turned to seize it. Chickamauga was a fight for possession of a road.",
          },
          {
            h: 0,
            t: "Back along this road raced Crittenden’s corps, with those of Thomas and McCook, which had not before traversed it. The whole army was moving by its left.",
          },
          {
            h: 0,
            t: "There was sharp fighting all along and all day, for the forest was so dense that the hostile lines came almost into contact before fighting was possible. One instance was particularly horrible. After some hours of close engagement my brigade, with foul pieces and exhausted cartridge boxes, was relieved and withdrawn to the road to protect several batteries of artillery—probably two dozen pieces—which commanded an open field in the rear of our line. Before our weary and virtually disarmed men had actually reached the guns the line in front gave way, fell back behind the guns and went on, the Lord knows whither. A moment later the field was gray with Confederates in pursuit. Then the guns opened fire with grape and canister and for perhaps five minutes—it seemed an hour—nothing could be heard but the infernal din of their discharge and nothing seen through the smoke but a great ascension of dust from the smitten soil. When all was over, and the dust cloud had lifted, the spectacle was too dreadful to describe. The Confederates were still there—all of them, it seemed—some almost under the muzzles of the guns. But not a man of all these brave fellows was on his feet, and so thickly were all covered with dust that they looked as if they had been reclothed in yellow.",
          },
          {
            h: 0,
            t: "“We bury our dead,” said a gunner, grimly, though doubtless all were afterward dug out, for some were partly alive.",
          },
          {
            h: 0,
            t: "To a “day of danger” succeeded a “night of waking.” The enemy, everywhere held back from the road, continued to stretch his line northward in the hope to overlap us and put himself between us and Chattanooga. We neither saw nor heard his movement, but any man with half a head would have known that he was making it, and we met by a parallel movement to our left. By morning we had edged along a good way and thrown up rude intrenchments at a little distance from the road, on the threatened side. The day was not very far advanced when we were attacked furiously all along the line, beginning at the left. When repulsed, the enemy came again and again—his persistence was dispiriting. He seemed to be using against us the law of probabilities: for so many efforts one would eventually succeed.",
          },
          {
            h: 0,
            t: "One did, and it was my luck to see it win. I had been sent by my chief, General Hazen, to order up some artillery ammunition and rode away to the right and rear in search of it. Finding an ordnance train I obtained from the officer in charge a few wagons loaded with what I wanted, but he seemed in doubt as to our occupancy of the region across which I proposed to guide them. Although assured that I had just traversed it, and that it lay immediately behind Wood’s division, he insisted on riding to the top of the ridge behind which his train lay and overlooking the ground. We did so, when to my astonishment I saw the entire country in front swarming with Confederates; the very earth seemed to be moving toward us! They came on in thousands, and so rapidly that we had barely time to turn tail and gallop down the hill and away, leaving them in possession of the train, many of the wagons being upset by frantic efforts to put them about. By what miracle that officer had sensed the situation I did not learn, for we parted company then and there and I never again saw him.",
          },
          {
            h: 0,
            t: "By a misunderstanding Wood’s division had been withdrawn from our line of battle just as the enemy was making an assault. Through the gap of a half a mile the Confederates charged without opposition, cutting our army clean in two. The right divisions were broken up and with General Rosecrans in their midst fled how they could across the country, eventually bringing up in Chattanooga, whence Rosecrans telegraphed to Washington the destruction of the rest of his army. The rest of his army was standing its ground.",
          },
          {
            h: 0,
            t: "A good deal of nonsense used to be talked about the heroism of General Garfield, who, caught in the rout of the right, nevertheless went back and joined the undefeated left under General Thomas. There was no great heroism in it; that is what every man should have done, including the commander of the army. We could hear Thomas’s guns going—those of us who had ears for them—and all that was needful was to make a sufficiently wide detour and then move toward the sound. I did so myself, and have never felt that it ought to make me President. Moreover, on my way I met General Negley, and my duties as topographical engineer having given me some knowledge of the lay of the land offered to pilot him back to glory. I am sorry to say my good offices were rejected a little uncivilly, which I charitably attributed to the general’s obvious absence of mind. His mind, I think, was in Nashville, behind a breastwork.",
          },
          {
            h: 0,
            t: "Unable to find my brigade, I reported to General Thomas, who directed me to remain with him. He had assumed command of all the forces still intact and was pretty closely beset. The battle was fierce and continuous, the enemy extending his lines farther and farther around our right, toward our line of retreat. We could not meet the extension otherwise than by “refusing” our right flank and letting him inclose us; which but for gallant Gordon Granger he would inevitably have done.",
          },
          {
            h: 0,
            t: "This was the way of it. Looking across the fields in our rear (rather longingly) I had the happy distinction of a discoverer. What I saw was the shimmer of sunlight on metal: lines of troops were coming in behind us! The distance was too great, the atmosphere too hazy to distinguish the color of their uniform, even with a glass. Reporting my momentous “find” I was directed by the general to go and see who they were. Galloping toward them until near enough to see that they were of our kidney I hastened back with the glad tidings and was sent again, to guide them to the general’s position.",
          },
          {
            h: 0,
            t: "It was General Granger with two strong brigades of the reserve, moving soldier-like toward the sound of heavy firing. Meeting him and his staff I directed him to Thomas, and unable to think of anything better to do decided to go visiting. I knew I had a brother in that gang—an officer of an Ohio battery. I soon found him near the head of a column, and as we moved forward we had a comfortable chat amongst such of the enemy’s bullets as had inconsiderately been fired too high. The incident was a trifle marred by one of them unhorsing another officer of the battery, whom we propped against a tree and left. A few moments later Granger’s force was put in on the right and the fighting was terrific!",
          },
          {
            h: 0,
            t: "By accident I now found Hazen’s brigade—or what remained of it—which had made a half-mile march to add itself to the unrouted at the memorable Snodgrass Hill. Hazen’s first remark to me was an inquiry about that artillery ammunition that he had sent me for.",
          },
          {
            h: 0,
            t: "It was needed badly enough, as were other kinds: for the last hour or two of that interminable day Granger’s were the only men that had enough ammunition to make a five minutes’ fight. Had the Confederates made one more general attack we should have had to meet them with the bayonet alone. I don’t know why they did not; probably they were short of ammunition. I know, though, that while the sun was taking its own time to set we lived through the agony of at least one death each, waiting for them to come on.",
          },
        ],
        tpl: "tabloid",
        cols: 3,
        cut: "band",
        cap: "THE CHICKAMAUGA BATTLEFIELD, SEPTEMBER 1863.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Chickamauga_battlefield._%28Sept_19-20%2C_1863%29_LOC_99447309.jpg/960px-Chickamauga_battlefield._%28Sept_19-20%2C_1863%29_LOC_99447309.jpg",
      },
    ];
    /* The draw is published and overridable. A page that prints a different
     * article every load cannot be checked by reloading it, so "?article=3"
     * pins one, and window.__article says which one is on the sheet. */
    const ARTICLE = (() => {
      const m = /[?&]article=(\d+)/.exec(location.search);
      const i = m
        ? Math.min(ARTICLES.length - 1, Math.max(0, +m[1]))
        : Math.floor(Math.random() * ARTICLES.length);
      window.__article = {
        i: i,
        paper: ARTICLES[i].paper,
        head: ARTICLES[i].head.join(" "),
      };
      return ARTICLES[i];
    })();

    const PAGE_RES = 1024;
    const PANEL_N = 10; // 100 tiles: 25 stills, then 7 loops of 10 frames
    // Ten frames at twelve a second is a loop of five sixths of a second, and
    // it reads as motion. Six at four a second read as a slideshow.
    // Seven sequences, not four: a third of the twenty plates must be moving.
    const STILLS = 25,
      SEQS = 7,
      FRAMES = 10;
    const PANEL_S = 288; // 10x288 -> 2880px; 320 put the sheet past 3200px
    // and mipmap inside the first frame, for no gain

    /* ------------------------------------------------------- the panels
     * What the flakes carry: twenty-five charts and maps and four loops, drawn
     * fetched. The gallery thumbnails that were here are photographs, and the
     * product is about charts, maps and motion.
     *
     * These are not decoration in house colours: they use the palettes real
     * data work uses — sequential, diverging, categorical, viridis — and carry
     * the furniture that makes a chart read as a chart: axes, ticks, grid,
     * legend, title, source. Drawn synchronously, so there is no image to wait
     * for and no loading race.
     */
    const SEQ_B = ["#eff6fb", "#c6dbef", "#6baed6", "#2171b5", "#08306b"];
    const SEQ_O = ["#fff3e6", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"];
    const SEQ_G = ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"];
    const VIRID = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
    const DIVRG = ["#2166ac", "#92c5de", "#f4f4f2", "#f4a582", "#b2182b"];
    const MAGMA = ["#fcfdbf", "#fe9f6d", "#de4968", "#8c2981", "#3b0f70"];
    const YEARS = ["2019", "2020", "2021", "2022", "2023"];
    const PLACES = ["North", "East", "Central", "West", "South", "Coast"];
    const NAMES = [
      "Northgate",
      "Rivermouth",
      "Old Port",
      "Elmfield",
      "South Bank",
      "Kingsway",
      "Ashford",
      "Bellevue",
    ];

    /* A deck of charts is never all on white. Six grounds — three light, three
     * dark — each carrying its own ink, grid, categorical set and basemap. The
     * painters read whichever is current, so a tile changes ground without any
     * of them knowing.
     */
    const THEMES = [
      {
        bg: "#fcfbf8",
        ink: "#1c1c22",
        mute: "#8a8a93",
        grid: "#dcdcd6",
        dim: "#c9ced6",
        cat: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"],
        ramp: SEQ_B,
        water: "#bcdcec",
        land: "#f6f4ef",
        park: "#cfe6c4",
        block: "#e9e5dd",
        roadC: "#e2ded6",
        roadF: "#ffffff",
        trunkC: "#e0bf7a",
        trunkF: "#fbe2ab",
        coast: "#9fbecd",
        place: "#6b6b72",
        chrome: "#f0eee8",
        dot: "#f2b13c",
      },
      {
        bg: "#10151f",
        ink: "#e9ecf3",
        mute: "#7c8496",
        grid: "#242c3c",
        dim: "#2c3547",
        cat: ["#7cb3e8", "#ffb35c", "#ff7f7f", "#63d3c6", "#9ad86f"],
        ramp: VIRID,
        water: "#0b1220",
        land: "#1a2130",
        park: "#22362a",
        block: "#232b3a",
        roadC: "#2b3446",
        roadF: "#48546b",
        trunkC: "#6a5326",
        trunkF: "#b08a3c",
        coast: "#33405a",
        place: "#8e97ab",
        chrome: "#161d2b",
        dot: "#7cb3e8",
      },
      {
        bg: "#f6efe2",
        ink: "#2b2118",
        mute: "#8f7f6b",
        grid: "#e2d7c4",
        dim: "#ddd0b9",
        cat: ["#bc5a2e", "#3f7d6e", "#c9a227", "#7a5c8f", "#4a6fa5"],
        ramp: SEQ_O,
        water: "#cfe0dd",
        land: "#faf5ea",
        park: "#d9e4c2",
        block: "#ece2d0",
        roadC: "#e6dac4",
        roadF: "#fffdf7",
        trunkC: "#dcb673",
        trunkF: "#f7dfa8",
        coast: "#a9bdb8",
        place: "#7b6a56",
        chrome: "#ece3d2",
        dot: "#bc5a2e",
      },
      {
        bg: "#121216",
        ink: "#f1f1ef",
        mute: "#83837f",
        grid: "#26262c",
        dim: "#2e2e35",
        cat: ["#f2b13c", "#5ec1ff", "#ff6f61", "#8ee08a", "#c79bff"],
        ramp: MAGMA,
        water: "#0d0d12",
        land: "#1b1b21",
        park: "#20301f",
        block: "#242430",
        roadC: "#2c2c36",
        roadF: "#4a4a58",
        trunkC: "#6b5320",
        trunkF: "#b78f34",
        coast: "#343442",
        place: "#93938e",
        chrome: "#1a1a20",
        dot: "#f2b13c",
      },
      {
        bg: "#eef1f4",
        ink: "#1a2230",
        mute: "#77839a",
        grid: "#dbe1e8",
        dim: "#cbd3de",
        cat: ["#2166ac", "#ef8a62", "#4d9221", "#c51b7d", "#8073ac"],
        ramp: DIVRG,
        water: "#c3dcea",
        land: "#f7f9fb",
        park: "#d6e8cd",
        block: "#e4e9ef",
        roadC: "#dde3ea",
        roadF: "#ffffff",
        trunkC: "#d9bd83",
        trunkF: "#f6e3b4",
        coast: "#9db9c9",
        place: "#63708a",
        chrome: "#e3e8ee",
        dot: "#2166ac",
      },
      {
        bg: "#0f2b2e",
        ink: "#dff0ec",
        mute: "#6f9490",
        grid: "#1b3d40",
        dim: "#20474a",
        cat: ["#7fd4c1", "#ffd166", "#ef8a7a", "#9ec9ff", "#c3e88d"],
        ramp: SEQ_G,
        water: "#0a1f22",
        land: "#163639",
        park: "#1d4436",
        block: "#1c4045",
        roadC: "#20474b",
        roadF: "#3b6b6d",
        trunkC: "#63562a",
        trunkF: "#a98f43",
        coast: "#2c5a5e",
        place: "#8fb2ad",
        chrome: "#14383b",
        dot: "#7fd4c1",
      },
      {
        bg: "#1d1424",
        ink: "#f0e8f6",
        mute: "#9a86a6",
        grid: "#2e2135",
        dim: "#382942",
        cat: ["#e6a6ff", "#ffc48a", "#8fe0d0", "#ff8fa8", "#b8c6ff"],
        ramp: MAGMA,
        water: "#120c17",
        land: "#241a2c",
        park: "#243a2c",
        block: "#2c2036",
        roadC: "#352745",
        roadF: "#5b466e",
        trunkC: "#6d4a2a",
        trunkF: "#b98a4a",
        coast: "#3d2f4c",
        place: "#a996b3",
        chrome: "#251a2e",
        dot: "#e6a6ff",
      },
      {
        bg: "#f2f7f4",
        ink: "#16241d",
        mute: "#6f8a7e",
        grid: "#dbe8e0",
        dim: "#c9dbd1",
        cat: ["#1b7a5a", "#e2703a", "#3d5a80", "#c9a227", "#8a4f7d"],
        ramp: SEQ_G,
        water: "#c8e2e6",
        land: "#fbfdfb",
        park: "#d3e9cf",
        block: "#e6efe9",
        roadC: "#dde8e1",
        roadF: "#ffffff",
        trunkC: "#dcc083",
        trunkF: "#f8e7b6",
        coast: "#9ec0b6",
        place: "#5f7a6e",
        chrome: "#e6efe9",
        dot: "#1b7a5a",
      },
    ];
    let T = THEMES[0];

    /* Every tile carries a story: its own subject, its own file name, its own
     * source. Painted from a shared title the deck read as one chart drawn
     * twenty-five times; the kind alone is not enough to tell them apart.
     */
    let ST = { t: "", s: "", f: "data.csv", src: "statistics office", c: 0 };
    const STORIES = [
      [
        "Output by region",
        "index, 2019 = 100",
        "output-2023.csv",
        "national accounts",
      ],
      ["Change since 2019", "% by district", "districts.topo", "land registry"],
      [
        "Share of reporting",
        "% of published stories",
        "newsroom-mix.csv",
        "media monitor",
      ],
      [
        "Reported incidents",
        "one circle per district",
        "incidents.parquet",
        "police open data",
      ],
      [
        "Ten largest by volume",
        "thousand tonnes, 2023",
        "freight-2023.csv",
        "port authority",
      ],
      [
        "Coverage by month",
        "stories per desk",
        "coverage.csv",
        "newsroom archive",
      ],
      [
        "Where it happened",
        "one dot per event",
        "events-geo.csv",
        "field reports",
      ],
      [
        "Where the time goes",
        "hours per week, cumulative",
        "timesheets.csv",
        "internal survey",
      ],
      [
        "Cost against reach",
        "each dot is one outlet",
        "outlets.csv",
        "audience panel",
      ],
      [
        "Movement between regions",
        "thousands of people",
        "flows-2024.csv",
        "census bureau",
      ],
      [
        "Net change by sector",
        "percentage points",
        "sectors.csv",
        "labour survey",
      ],
      ["Formats published", "share of total", "formats.json", "editorial log"],
      [
        "Delay before publication",
        "hours, all desks",
        "latency.parquet",
        "pipeline logs",
      ],
      [
        "Before and after the rule",
        "cases per 1,000",
        "ruling-effect.csv",
        "health ministry",
      ],
      [
        "City against country",
        "percentage points, 2024",
        "gap-2024.csv",
        "statistics office",
      ],
      [
        "One hundred requests",
        "how each was answered",
        "foi-requests.csv",
        "transparency unit",
      ],
      [
        "Spread of response times",
        "minutes, by service",
        "response-times.csv",
        "emergency board",
      ],
      ["Energy by source", "terawatt hours", "grid-mix.csv", "grid operator"],
      [
        "Budget by department",
        "million, 2024",
        "budget-2024.csv",
        "finance ministry",
      ],
      [
        "Six indicators, five years",
        "indexed to first year",
        "indicators.csv",
        "national accounts",
      ],
      [
        "Population by age",
        "thousands, by sex",
        "population.csv",
        "census bureau",
      ],
      [
        "Density of filings",
        "per hexagon, 5 km",
        "filings-hex.geojson",
        "court registry",
      ],
      [
        "Rainfall over the basin",
        "mm, contour every 20",
        "rainfall.tif",
        "weather service",
      ],
      [
        "The route the convoy took",
        "18 stops, 340 km",
        "convoy-route.geojson",
        "satellite trace",
      ],
      [
        "Seats by region",
        "one square is one seat",
        "seats-2024.csv",
        "electoral commission",
      ],
    ];
    const SEQ_STORIES = [
      [
        "Reservoir level",
        "% of capacity, live",
        "reservoir.json",
        "water utility",
      ],
      [
        "Traffic through the day",
        "requests per second",
        "traffic.csv",
        "edge logs",
      ],
      [
        "Who talks to whom",
        "messages between desks",
        "graph.json",
        "mail server",
      ],
      [
        "Price of the index",
        "open, high, low, close",
        "index-daily.csv",
        "exchange feed",
      ],
      [
        "Six axes of the audit",
        "score out of 100",
        "audit.json",
        "internal audit",
      ],
      [
        "Wind through the year",
        "hours per direction",
        "wind-rose.csv",
        "met office",
      ],
      [
        "Where the money goes",
        "source to programme",
        "allocations.json",
        "audit office",
      ],
    ];

    function paintPanels() {
      const N = PANEL_N,
        S = PANEL_S;
      const cv = document.createElement("canvas");
      cv.width = cv.height = N * S;
      const g = cv.getContext("2d");
      let seed = 7;
      const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const SANS = '600 REMpx "Public Sans", Helvetica, sans-serif';
      const txt = (t, x, y, px, col, align, w) => {
        g.font = SANS.replace("REM", px).replace("600", w || 600);
        g.fillStyle = col;
        g.textAlign = align || "left";
        g.fillText(t, x, y);
        g.textAlign = "left";
      };

      // three strips, dealt per tile: even the status bar should not repeat
      const CHIPSETS = [
        [
          ["Live", true],
          ["Draft", false],
          ["Shared", false],
        ],
        [
          ["Final", true],
          ["v3", false],
          ["Locked", false],
        ],
        [
          ["Auto", true],
          ["Daily", false],
          ["Public", false],
        ],
      ];

      /* --------------------------------------------------------- the chrome
       * A chart on a bare rectangle reads as a flat panel. The same chart under
       * a title bar, with a file name, tool squares and a status strip, reads
       * as a window onto a working document — which is what the product makes.
       * Kept quiet: it frames the chart, it never competes with it.
       */
      function chromeTop(x, y, i) {
        const h = S * 0.082;
        g.fillStyle = T.chrome;
        g.fillRect(x, y, S, h);
        g.fillStyle = T.grid;
        g.fillRect(x, y + h - S * 0.0035, S, S * 0.0035);
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.arc(x + S * (0.036 + k * 0.032), y + h * 0.5, S * 0.0095, 0, 7);
          g.fillStyle = k ? T.mute : T.dot;
          g.globalAlpha = k ? 0.4 : 1;
          g.fill();
        }
        g.globalAlpha = 1;
        txt(
          ST.f,
          x + S * 0.15,
          y + h * 0.5 + S * 0.011,
          S * 0.027,
          T.mute,
          "left",
          500,
        );
        for (let k = 0; k < 3; k++) {
          g.fillStyle = T.grid;
          g.fillRect(
            x + S * (0.845 + k * 0.042),
            y + h * 0.5 - S * 0.013,
            S * 0.026,
            S * 0.026,
          );
        }
        return h;
      }

      function chromeFoot(x, y, i) {
        const h = S * 0.072,
          ty = y + S - h;
        g.fillStyle = T.chrome;
        g.fillRect(x, ty, S, h);
        g.fillStyle = T.grid;
        g.fillRect(x, ty, S, S * 0.0035);
        let cx = x + S * 0.036;
        CHIPSETS[ST.c % CHIPSETS.length].forEach(([label, on]) => {
          const w = S * (0.055 + label.length * 0.017);
          g.fillStyle = on ? T.dot : T.grid;
          g.globalAlpha = on ? 0.9 : 0.55;
          g.fillRect(cx, ty + h * 0.28, w, h * 0.44);
          g.globalAlpha = 1;
          txt(
            label,
            cx + w / 2,
            ty + h * 0.62,
            S * 0.024,
            on ? T.chrome : T.mute,
            "center",
            600,
          );
          cx += w + S * 0.022;
        });
        txt(
          ST.src,
          x + S - S * 0.036,
          ty + h * 0.62,
          S * 0.024,
          T.mute,
          "right",
          500,
        );
        return h;
      }

      function chromeEdge(x, y) {
        g.strokeStyle = T.grid;
        g.lineWidth = S * 0.005;
        g.strokeRect(
          x + S * 0.0025,
          y + S * 0.0025,
          S - S * 0.005,
          S - S * 0.005,
        );
      }

      // title, subtitle, source, and the plot rectangle underneath them
      function frame(x, y, title, sub, i) {
        g.fillStyle = T.bg;
        g.fillRect(x, y, S, S);
        chromeTop(x, y, i || 0);
        chromeFoot(x, y, i || 0);
        txt(title, x + S * 0.05, y + S * 0.175, S * 0.05, T.ink, "left", 700);
        txt(sub, x + S * 0.05, y + S * 0.222, S * 0.032, T.mute, "left", 500);
        // b leaves room for the tick row at b + 0.055, clear of the footer
        return {
          l: x + S * 0.05,
          r: x + S * 0.95,
          t: y + S * 0.305,
          b: y + S * 0.845,
        };
      }

      // Maps go edge to edge and wear their title on a scrim. A basemap inset
      // in a margin reads as a thumbnail of a map; a basemap that runs off the
      // tile reads as the map itself — and it leaves no dead ground on a flake.
      function mapFrame(x, y, title, sub, i) {
        const B = { l: x, r: x + S, t: y, b: y + S };
        basemap(B);
        chromeTop(x, y, i || 0);
        chromeFoot(x, y, i || 0);
        const grd = g.createLinearGradient(x, y + S * 0.082, x, y + S * 0.4);
        grd.addColorStop(0, T.bg);
        grd.addColorStop(1, T.bg + "00");
        g.fillStyle = grd;
        g.globalAlpha = 0.86;
        g.fillRect(x, y + S * 0.082, S, S * 0.32);
        g.globalAlpha = 1;
        txt(title, x + S * 0.05, y + S * 0.175, S * 0.05, T.ink, "left", 700);
        txt(sub, x + S * 0.05, y + S * 0.222, S * 0.032, T.mute, "left", 500);
        return {
          l: x + S * 0.03,
          r: x + S * 0.97,
          t: y + S * 0.26,
          b: y + S * 0.925,
        };
      }
      function axes(B, ticks) {
        g.strokeStyle = T.grid;
        g.lineWidth = S * 0.004;
        for (let i = 1; i <= 4; i++) {
          const yy = B.b - ((B.b - B.t) * i) / 4;
          g.beginPath();
          g.moveTo(B.l, yy);
          g.lineTo(B.r, yy);
          g.stroke();
        }
        g.strokeStyle = T.ink;
        g.lineWidth = S * 0.006;
        g.beginPath();
        g.moveTo(B.l, B.b);
        g.lineTo(B.r, B.b);
        g.stroke();
        if (ticks)
          ticks.forEach((t, i) =>
            txt(
              t,
              B.l + ((B.r - B.l) * (i + 0.5)) / ticks.length,
              B.b + S * 0.055,
              S * 0.03,
              T.mute,
              "center",
              500,
            ),
          );
      }
      function legend(B, items, cols) {
        items.forEach((it, i) => {
          // clear of the subtitle: the plot box moved down for the chrome and
          // the legend was still hanging off the old top
          const x = B.l + i * S * 0.185,
            y = B.t - S * 0.028;
          g.fillStyle = cols[i % cols.length];
          g.fillRect(x, y - S * 0.026, S * 0.03, S * 0.03);
          txt(it, x + S * 0.042, y, S * 0.028, T.mute, "left", 500);
        });
      }

      /* ------------------------------------------------------- the charts
       * Twenty-five still kinds, no two of the same family, each with its own
       * subject, file name and source. A deck that repeats a kind reads as a
       * deck of one chart recoloured, which is exactly what it must not be.
       */

      function grouped(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["Urban", "Rural"], T.cat);
        axes(B, YEARS);
        const n = 5,
          w = (B.r - B.l) / n;
        for (let a = 0; a < n; a++)
          for (let k = 0; k < 2; k++) {
            const v = 0.3 + rnd() * 0.65;
            g.fillStyle = T.cat[k];
            g.fillRect(
              B.l + a * w + w * (0.18 + k * 0.32),
              B.b - (B.b - B.t) * v,
              w * 0.28,
              (B.b - B.t) * v,
            );
          }
      }

      function multiline(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["Text", "Charts", "Maps"], T.cat);
        axes(B, YEARS);
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          for (let a = 0; a < 9; a++) {
            const px = B.l + ((B.r - B.l) * a) / 8;
            const py = B.b - (B.b - B.t) * (0.15 + k * 0.22 + rnd() * 0.3);
            a ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.strokeStyle = T.cat[k];
          g.lineWidth = S * 0.013;
          g.lineJoin = "round";
          g.stroke();
        }
      }

      function ranked(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const n = 7,
          h = (B.b - B.t) / n;
        for (let a = 0; a < n; a++) {
          const v = 1 - a * 0.12 - rnd() * 0.06;
          g.fillStyle = a === 0 ? T.cat[1] : T.dim;
          g.fillRect(
            B.l + S * 0.16,
            B.t + a * h + h * 0.18,
            (B.r - B.l - S * 0.16) * v,
            h * 0.6,
          );
          txt(
            NAMES[a % NAMES.length],
            B.l + S * 0.14,
            B.t + a * h + h * 0.62,
            S * 0.03,
            T.ink,
            "right",
            600,
          );
        }
      }

      function scatterR(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        axes(B, null);
        for (let a = 0; a < 46; a++) {
          const u = rnd(),
            v = u * 0.65 + rnd() * 0.35;
          g.fillStyle = T.cat[(a * 7) % 3];
          g.globalAlpha = 0.8;
          g.beginPath();
          g.arc(
            B.l + (B.r - B.l) * u,
            B.b - (B.b - B.t) * v,
            S * (0.011 + rnd() * 0.016),
            0,
            7,
          );
          g.fill();
        }
        g.globalAlpha = 1;
        g.beginPath();
        g.moveTo(B.l, B.b - (B.b - B.t) * 0.18);
        g.lineTo(B.r, B.b - (B.b - B.t) * 0.82);
        g.strokeStyle = T.ink;
        g.lineWidth = S * 0.008;
        g.setLineDash([S * 0.02, S * 0.016]);
        g.stroke();
        g.setLineDash([]);
      }

      function heat(x, y, ramp, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = 8,
          cy = 6,
          w = (B.r - B.l) / cx,
          h = (B.b - B.t) / cy;
        for (let a = 0; a < cx; a++)
          for (let k = 0; k < cy; k++) {
            g.fillStyle = ramp[Math.min(4, (rnd() * 5) | 0)];
            g.fillRect(B.l + a * w, B.t + k * h, w * 0.94, h * 0.9);
          }
        ramp.forEach((c, k) => {
          g.fillStyle = c;
          g.fillRect(B.l + k * S * 0.055, B.b + S * 0.03, S * 0.05, S * 0.022);
        });
      }

      function stackedArea(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["Report", "Build", "Ship"], T.cat);
        axes(B, YEARS);
        const n = 9,
          base = new Array(n).fill(0);
        for (let k = 0; k < 3; k++) {
          const top = [];
          for (let a = 0; a < n; a++) base[a] += 0.12 + rnd() * 0.2;
          g.beginPath();
          for (let a = 0; a < n; a++) {
            const px = B.l + ((B.r - B.l) * a) / (n - 1);
            const py = B.b - (B.b - B.t) * base[a];
            top.push([px, py]);
            a ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          for (let a = n - 1; a >= 0; a--)
            g.lineTo(
              top[a][0],
              B.b - (B.b - B.t) * (base[a] - 0.12 - rnd() * 0.001),
            );
          g.closePath();
          g.fillStyle = T.cat[k];
          g.globalAlpha = 0.9;
          g.fill();
        }
        g.globalAlpha = 1;
      }

      function donut(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = (B.l + B.r) / 2,
          cy = (B.t + B.b) / 2 + S * 0.02;
        const R = Math.min(B.r - B.l, B.b - B.t) * 0.42;
        let a0 = -Math.PI / 2;
        const parts = [0.34, 0.26, 0.18, 0.12, 0.1];
        parts.forEach((pv, k) => {
          const a1 = a0 + pv * Math.PI * 2;
          g.beginPath();
          g.moveTo(cx, cy);
          g.arc(cx, cy, R, a0, a1);
          g.closePath();
          g.fillStyle = T.cat[k];
          g.fill();
          a0 = a1;
        });
        // painted, not punched: destination-out leaves a transparent hole, and
        // a transparent hole in an atlas is a hole in the panel
        g.fillStyle = T.bg;
        g.beginPath();
        g.arc(cx, cy, R * 0.55, 0, 7);
        g.fill();
      }

      function diverging(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const n = 8,
          h = (B.b - B.t) / n,
          mid = (B.l + B.r) / 2;
        g.strokeStyle = T.grid;
        g.lineWidth = S * 0.004;
        g.beginPath();
        g.moveTo(mid, B.t);
        g.lineTo(mid, B.b);
        g.stroke();
        for (let a = 0; a < n; a++) {
          const v = ((a * 3) % 5 < 2 ? -1 : 1) * (0.32 + rnd() * 0.68);
          g.fillStyle = v > 0 ? DIVRG[4] : DIVRG[0];
          const w = (B.r - B.l) * 0.46 * Math.abs(v);
          g.fillRect(
            v > 0 ? mid : mid - w,
            B.t + a * h + h * 0.16,
            w,
            h * 0.66,
          );
          txt(
            NAMES[a % NAMES.length],
            v > 0 ? mid - S * 0.012 : mid + S * 0.012,
            B.t + a * h + h * 0.62,
            S * 0.026,
            T.mute,
            v > 0 ? "right" : "left",
            500,
          );
        }
      }

      // a distribution, not a ranking: bars touch, one axis is a scale
      function histogram(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        axes(B, ["0", "6", "12", "18", "24", "30"]);
        const n = 16,
          w = (B.r - B.l) / n;
        for (let a = 0; a < n; a++) {
          const c = (a - 5.2) / 4.4;
          const v = Math.exp(-c * c) * (0.72 + rnd() * 0.26) + 0.04;
          g.fillStyle = a === 5 ? T.cat[2] : T.cat[0];
          g.globalAlpha = a === 5 ? 1 : 0.85;
          g.fillRect(
            B.l + a * w,
            B.b - (B.b - B.t) * v,
            w - S * 0.004,
            (B.b - B.t) * v,
          );
        }
        g.globalAlpha = 1;
        const md = B.l + 5.5 * w;
        g.strokeStyle = T.ink;
        g.lineWidth = S * 0.005;
        g.setLineDash([S * 0.014, S * 0.012]);
        g.beginPath();
        g.moveTo(md, B.t);
        g.lineTo(md, B.b);
        g.stroke();
        g.setLineDash([]);
        txt(
          "median",
          md + S * 0.014,
          B.t + S * 0.035,
          S * 0.026,
          T.mute,
          "left",
          500,
        );
      }

      // two moments, one line each: the shape of the change is the chart
      function slope(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const xl = B.l + S * 0.2,
          xr = B.r - S * 0.2;
        g.strokeStyle = T.grid;
        g.lineWidth = S * 0.004;
        [xl, xr].forEach((px) => {
          g.beginPath();
          g.moveTo(px, B.t);
          g.lineTo(px, B.b);
          g.stroke();
        });
        for (let a = 0; a < 6; a++) {
          const v0 = 0.12 + rnd() * 0.8,
            v1 = Math.max(0.06, Math.min(0.94, v0 + (rnd() - 0.42) * 0.5));
          const y0 = B.b - (B.b - B.t) * v0,
            y1 = B.b - (B.b - B.t) * v1;
          const up = v1 > v0;
          g.strokeStyle = up ? T.cat[0] : T.cat[2];
          g.lineWidth = S * 0.009;
          g.beginPath();
          g.moveTo(xl, y0);
          g.lineTo(xr, y1);
          g.stroke();
          [
            [xl, y0],
            [xr, y1],
          ].forEach((p) => {
            g.fillStyle = up ? T.cat[0] : T.cat[2];
            g.beginPath();
            g.arc(p[0], p[1], S * 0.012, 0, 7);
            g.fill();
          });
          txt(
            PLACES[a % PLACES.length],
            xl - S * 0.022,
            y0 + S * 0.011,
            S * 0.026,
            T.mute,
            "right",
            500,
          );
          txt(
            ((v1 * 100) | 0) + "",
            xr + S * 0.022,
            y1 + S * 0.011,
            S * 0.026,
            T.ink,
            "left",
            600,
          );
        }
        txt("2021", xl, B.b + S * 0.055, S * 0.028, T.mute, "center", 600);
        txt("2024", xr, B.b + S * 0.055, S * 0.028, T.mute, "center", 600);
      }

      // the gap itself is the mark: two dots and the bar between them
      function dumbbell(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["City", "Country"], T.cat);
        const n = 7,
          h = (B.b - B.t) / n;
        for (let a = 0; a < n; a++) {
          const yy = B.t + a * h + h * 0.5;
          const x0 =
            B.l + S * 0.18 + (B.r - B.l - S * 0.22) * (0.05 + rnd() * 0.35);
          const x1 = x0 + (B.r - S * 0.04 - x0) * (0.18 + rnd() * 0.7);
          g.strokeStyle = T.dim;
          g.lineWidth = S * 0.012;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(x0, yy);
          g.lineTo(x1, yy);
          g.stroke();
          g.fillStyle = T.cat[0];
          g.beginPath();
          g.arc(x0, yy, S * 0.016, 0, 7);
          g.fill();
          g.fillStyle = T.cat[1];
          g.beginPath();
          g.arc(x1, yy, S * 0.016, 0, 7);
          g.fill();
          txt(
            NAMES[a % NAMES.length],
            B.l + S * 0.15,
            yy + S * 0.011,
            S * 0.026,
            T.mute,
            "right",
            500,
          );
        }
      }

      // a hundred squares, one per unit: counting, not measuring
      function waffle(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cols = 10,
          rows = 10;
        const cw = (B.r - B.l) / cols,
          ch = (B.b - B.t) / rows;
        const cut = [38, 62, 79, 91, 100];
        for (let a = 0; a < 100; a++) {
          let k = 0;
          while (a >= cut[k]) k++;
          g.fillStyle = T.cat[k];
          g.fillRect(
            B.l + (a % cols) * cw,
            B.t + ((a / cols) | 0) * ch,
            cw * 0.82,
            ch * 0.82,
          );
        }
        legend(B, ["Granted", "Partial", "Refused", "Late"], T.cat);
      }

      // box, whiskers, median and the points that fell outside them
      function boxplot(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        axes(B, ["A&E", "Fire", "Police", "Utility", "Transit"]);
        const n = 5,
          w = (B.r - B.l) / n;
        for (let a = 0; a < n; a++) {
          const cx = B.l + w * (a + 0.5);
          const med = 0.3 + rnd() * 0.4;
          const q1 = med - 0.06 - rnd() * 0.1,
            q3 = med + 0.06 + rnd() * 0.12;
          const lo = q1 - 0.05 - rnd() * 0.09,
            hi = q3 + 0.05 + rnd() * 0.11;
          const py = (v) => B.b - (B.b - B.t) * v;
          g.strokeStyle = T.ink;
          g.lineWidth = S * 0.005;
          g.beginPath();
          g.moveTo(cx, py(lo));
          g.lineTo(cx, py(hi));
          g.stroke();
          [lo, hi].forEach((v) => {
            g.beginPath();
            g.moveTo(cx - w * 0.12, py(v));
            g.lineTo(cx + w * 0.12, py(v));
            g.stroke();
          });
          g.fillStyle = T.cat[a % T.cat.length];
          g.globalAlpha = 0.85;
          g.fillRect(cx - w * 0.22, py(q3), w * 0.44, py(q1) - py(q3));
          g.globalAlpha = 1;
          g.strokeStyle = T.bg;
          g.lineWidth = S * 0.007;
          g.beginPath();
          g.moveTo(cx - w * 0.22, py(med));
          g.lineTo(cx + w * 0.22, py(med));
          g.stroke();
          for (let k = 0; k < 2; k++) {
            g.fillStyle = T.ink;
            g.globalAlpha = 0.55;
            g.beginPath();
            g.arc(
              cx + (rnd() - 0.5) * w * 0.2,
              py(hi + 0.04 + rnd() * 0.12),
              S * 0.008,
              0,
              7,
            );
            g.fill();
          }
          g.globalAlpha = 1;
        }
      }

      // the same bars, bent around a centre
      function radialBar(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = (B.l + B.r) / 2,
          cy = (B.t + B.b) / 2 + S * 0.015;
        const R = Math.min(B.r - B.l, B.b - B.t) * 0.52;
        const n = 5;
        for (let a = 0; a < n; a++) {
          const r = R * (0.46 + (a / n) * 0.54);
          g.lineWidth = R * 0.088;
          g.lineCap = "butt";
          g.strokeStyle = T.dim;
          g.globalAlpha = 0.45;
          g.beginPath();
          g.arc(cx, cy, r, -Math.PI * 0.5, Math.PI * 1.5);
          g.stroke();
          g.globalAlpha = 1;
          g.strokeStyle = T.cat[a % T.cat.length];
          g.beginPath();
          g.arc(
            cx,
            cy,
            r,
            -Math.PI * 0.5,
            -Math.PI * 0.5 + (0.25 + rnd() * 0.72) * Math.PI * 2,
          );
          g.stroke();
        }
        g.lineCap = "round";
        legend(B, ["Hydro", "Wind", "Gas", "Solar", "Coal"], T.cat);
        txt("681 TWh", cx, cy + S * 0.012, S * 0.042, T.ink, "center", 700);
      }

      // recursive splits: area is the value, and nothing is a bar
      function treemap(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const boxes = [];
        (function split(l, t, r, b, depth) {
          if (depth === 0 || (r - l) * (b - t) < S * S * 0.012) {
            boxes.push([l, t, r, b]);
            return;
          }
          const horiz = r - l > b - t;
          const f = 0.34 + rnd() * 0.32;
          if (horiz) {
            const m = l + (r - l) * f;
            split(l, t, m, b, depth - 1);
            split(m, t, r, b, depth - 1);
          } else {
            const m = t + (b - t) * f;
            split(l, t, r, m, depth - 1);
            split(l, m, r, b, depth - 1);
          }
        })(B.l, B.t, B.r, B.b, 3);
        boxes.forEach((bx, k) => {
          g.fillStyle = T.ramp[k % T.ramp.length];
          g.fillRect(
            bx[0],
            bx[1],
            bx[2] - bx[0] - S * 0.006,
            bx[3] - bx[1] - S * 0.006,
          );
          if (bx[2] - bx[0] > S * 0.16)
            txt(
              PLACES[k % PLACES.length],
              bx[0] + S * 0.018,
              bx[1] + S * 0.048,
              S * 0.026,
              k > 2 ? T.bg : T.ink,
              "left",
              600,
            );
        });
      }

      // six little charts instead of one: the shape of each series, side by side
      function sparkGrid(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cols = 3,
          rows = 2;
        const cw = (B.r - B.l) / cols,
          ch = (B.b - B.t) / rows;
        for (let a = 0; a < cols * rows; a++) {
          const l = B.l + (a % cols) * cw,
            t = B.t + ((a / cols) | 0) * ch;
          const w = cw * 0.88,
            h = ch * 0.62;
          g.fillStyle = T.dim;
          g.globalAlpha = 0.28;
          g.fillRect(l, t + ch * 0.24, w, h);
          g.globalAlpha = 1;
          g.beginPath();
          let last = 0;
          for (let n = 0; n < 12; n++) {
            const v = 0.15 + rnd() * 0.7;
            last = t + ch * 0.24 + h * (1 - v);
            const px = l + (w * n) / 11;
            n ? g.lineTo(px, last) : g.moveTo(px, last);
          }
          g.strokeStyle = T.cat[a % T.cat.length];
          g.lineWidth = S * 0.009;
          g.lineJoin = "round";
          g.stroke();
          g.fillStyle = T.cat[a % T.cat.length];
          g.beginPath();
          g.arc(l + w, last, S * 0.011, 0, 7);
          g.fill();
          txt(
            PLACES[a % PLACES.length],
            l,
            t + ch * 0.16,
            S * 0.026,
            T.mute,
            "left",
            600,
          );
        }
      }

      // back to back: the only chart here that reads from the middle out
      function pyramid(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["Men", "Women"], T.cat);
        const n = 9,
          h = (B.b - B.t) / n,
          mid = (B.l + B.r) / 2,
          gap = S * 0.038;
        for (let a = 0; a < n; a++) {
          const yy = B.t + a * h;
          const shape = 1 - Math.abs(a - 3) * 0.09;
          const wl = (B.r - B.l) * 0.42 * shape * (0.55 + rnd() * 0.45);
          const wr = (B.r - B.l) * 0.42 * shape * (0.55 + rnd() * 0.45);
          g.fillStyle = T.cat[0];
          g.fillRect(mid - gap - wl, yy + h * 0.16, wl, h * 0.66);
          g.fillStyle = T.cat[1];
          g.fillRect(mid + gap, yy + h * 0.16, wr, h * 0.66);
          txt(
            80 - a * 10 + "",
            mid,
            yy + h * 0.62,
            S * 0.024,
            T.mute,
            "center",
            500,
          );
        }
      }

      /* ------------------------------------------------------ the basemap
       * A blob with a graticule is not a map — it reads as a shape. What makes
       * a map read is the furniture underneath the data: water, a coastline,
       * parks, a river, a road network drawn casing-then-fill, blocks of
       * building, and place names. All of it procedural, none of it fetched.
       */

      // an irregular coast: land fills most of the tile, water at two corners
      function coast(B) {
        const w = B.r - B.l,
          h = B.b - B.t;
        const pts = [];
        const n = 9;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          pts.push([
            B.l + w * t,
            B.t + h * (0.12 + 0.2 * Math.sin(t * 5.2 + 1.1) + rnd() * 0.08),
          ]);
        }
        g.beginPath();
        g.moveTo(B.l, B.b);
        g.lineTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i - 1],
            q = pts[i];
          g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        }
        g.lineTo(B.r, pts[pts.length - 1][1]);
        g.lineTo(B.r, B.b);
        g.closePath();
      }

      function roadLine(B, pts, casing, fill, wide) {
        g.lineCap = "round";
        g.lineJoin = "round";
        for (let pass = 0; pass < 2; pass++) {
          g.beginPath();
          pts.forEach((p, i) =>
            i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]),
          );
          g.strokeStyle = pass ? fill : casing;
          g.lineWidth = S * (wide ? (pass ? 0.02 : 0.03) : pass ? 0.01 : 0.017);
          g.stroke();
        }
      }

      function basemap(B) {
        g.fillStyle = T.water;
        g.fillRect(B.l, B.t, B.r - B.l, B.b - B.t);
        coast(B);
        g.save();
        g.clip();
        g.fillStyle = T.land;
        g.fillRect(B.l, B.t, B.r - B.l, B.b - B.t);

        // parks
        for (let i = 0; i < 3; i++) {
          g.fillStyle = T.park;
          g.beginPath();
          g.ellipse(
            B.l + (B.r - B.l) * rnd(),
            B.t + (B.b - B.t) * (0.35 + rnd() * 0.6),
            S * (0.05 + rnd() * 0.06),
            S * (0.04 + rnd() * 0.05),
            rnd() * 3,
            0,
            7,
          );
          g.fill();
        }

        // the river, and its mouth at the coast
        g.beginPath();
        let rx = B.l + (B.r - B.l) * (0.2 + rnd() * 0.6);
        g.moveTo(rx, B.b);
        for (let i = 1; i <= 5; i++) {
          rx += (rnd() - 0.5) * S * 0.14;
          g.quadraticCurveTo(
            rx,
            B.b - ((B.b - B.t) * i) / 5 + S * 0.04,
            rx,
            B.b - ((B.b - B.t) * i) / 5,
          );
        }
        g.strokeStyle = T.water;
        g.lineWidth = S * 0.028;
        g.lineCap = "round";
        g.stroke();

        // blocks of building along the grid
        for (let i = 0; i < 70; i++) {
          g.fillStyle = T.block;
          g.fillRect(
            B.l + (B.r - B.l) * rnd(),
            B.t + (B.b - B.t) * (0.25 + rnd() * 0.75),
            S * (0.012 + rnd() * 0.026),
            S * (0.01 + rnd() * 0.022),
          );
        }

        // minor streets: a soft grid, then the trunk roads over them
        for (let i = 0; i < 7; i++) {
          const yy =
            B.t + (B.b - B.t) * (0.22 + (i / 7) * 0.8 + (rnd() - 0.5) * 0.05);
          roadLine(
            B,
            [
              [B.l, yy],
              [B.l + (B.r - B.l) * 0.5, yy + (rnd() - 0.5) * S * 0.03],
              [B.r, yy + (rnd() - 0.5) * S * 0.04],
            ],
            T.roadC,
            T.roadF,
            false,
          );
        }
        for (let i = 0; i < 6; i++) {
          const xx = B.l + (B.r - B.l) * ((i + 0.5) / 6 + (rnd() - 0.5) * 0.06);
          roadLine(
            B,
            [
              [xx, B.t + (B.b - B.t) * 0.18],
              [xx + (rnd() - 0.5) * S * 0.04, B.b],
            ],
            T.roadC,
            T.roadF,
            false,
          );
        }
        roadLine(
          B,
          [
            [B.l, B.t + (B.b - B.t) * 0.55],
            [B.l + (B.r - B.l) * 0.42, B.t + (B.b - B.t) * 0.42],
            [B.r, B.t + (B.b - B.t) * 0.62],
          ],
          T.trunkC,
          T.trunkF,
          true,
        );
        roadLine(
          B,
          [
            [B.l + (B.r - B.l) * 0.3, B.b],
            [B.l + (B.r - B.l) * 0.38, B.t + (B.b - B.t) * 0.5],
            [B.l + (B.r - B.l) * 0.28, B.t + (B.b - B.t) * 0.2],
          ],
          T.trunkC,
          T.trunkF,
          true,
        );
        g.restore();

        // coastline, then the names on top of everything
        coast(B);
        g.strokeStyle = T.coast;
        g.lineWidth = S * 0.006;
        g.stroke();
        for (let i = 0; i < 4; i++)
          txt(
            NAMES[(i * 3 + 1) % NAMES.length],
            B.l + (B.r - B.l) * (0.12 + rnd() * 0.7),
            B.t + (B.b - B.t) * (0.32 + rnd() * 0.6),
            S * 0.028,
            T.place,
            "left",
            600,
          );
      }

      function choro(x, y, ramp, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        // districts over the basemap, translucent so the streets read through
        const cell = S * 0.075;
        g.globalAlpha = 0.72;
        for (let gx = B.l; gx < B.r; gx += cell)
          for (let gy = B.t; gy < B.b; gy += cell) {
            g.fillStyle = ramp[Math.min(4, (rnd() * 5) | 0)];
            g.fillRect(gx, gy, cell * 1.02, cell * 1.02);
            g.strokeStyle = T.bg;
            g.lineWidth = S * 0.003;
            g.strokeRect(gx, gy, cell * 1.02, cell * 1.02);
          }
        g.globalAlpha = 1;
        // no coastline here: the lobes overlap, so stroking the path draws the
        // seams between them straight across the cells. The cells are the shape.
        ramp.forEach((c, k) => {
          g.fillStyle = c;
          g.fillRect(B.l + k * S * 0.055, B.b + S * 0.03, S * 0.05, S * 0.022);
        });
      }

      function bubbleMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        for (let a = 0; a < 13; a++) {
          const r = S * (0.016 + rnd() * 0.055);
          g.beginPath();
          g.arc(
            B.l + (B.r - B.l) * (0.12 + rnd() * 0.76),
            B.t + (B.b - B.t) * (0.12 + rnd() * 0.76),
            r,
            0,
            7,
          );
          g.fillStyle = T.cat[a % 2 ? 1 : 0];
          g.globalAlpha = 0.62;
          g.fill();
          g.globalAlpha = 1;
          g.strokeStyle = T.bg;
          g.lineWidth = S * 0.004;
          g.stroke();
        }
      }

      function flowMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        // endpoints kept over the land and arcs kept shallow: sampled across
        // the whole box they flew off the tile and read as ribbons, not flows
        const px = () => B.l + (B.r - B.l) * (0.24 + rnd() * 0.52);
        const py = () => B.t + (B.b - B.t) * (0.24 + rnd() * 0.52);
        for (let a = 0; a < 7; a++) {
          const x0 = px(),
            y0 = py(),
            x1 = px(),
            y1 = py();
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo(
            (x0 + x1) / 2,
            Math.min(y0, y1) - S * 0.07,
            x1,
            y1,
          );
          g.strokeStyle = T.cat[a % 3];
          g.globalAlpha = 0.85;
          g.lineWidth = S * (0.006 + rnd() * 0.014);
          g.stroke();
          g.globalAlpha = 1;
          g.fillStyle = T.ink;
          g.beginPath();
          g.arc(x1, y1, S * 0.012, 0, 7);
          g.fill();
        }
      }

      function dotMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        g.save();
        g.beginPath();
        g.rect(B.l, B.t, B.r - B.l, B.b - B.t);
        g.clip();
        // clustered, and inside the coast: an even sprinkle over the whole box
        // reads as confetti rather than as where anything happened
        for (let c = 0; c < 5; c++) {
          const hx = B.l + (B.r - B.l) * (0.3 + rnd() * 0.4);
          const hy = B.t + (B.b - B.t) * (0.3 + rnd() * 0.4);
          const col = T.cat[c % 3];
          for (let a = 0; a < 70; a++) {
            const ang = rnd() * 7,
              r = rnd() ** 0.6 * S * 0.13;
            g.fillStyle = col;
            g.globalAlpha = 0.75;
            g.beginPath();
            g.arc(
              hx + Math.cos(ang) * r,
              hy + Math.sin(ang) * r,
              S * 0.0075,
              0,
              7,
            );
            g.fill();
          }
        }
        g.restore();
        g.globalAlpha = 1;
      }

      // a binned map: the geography survives, the noise of the points does not
      function hexMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        const R = S * 0.052,
          dx = R * 1.732,
          dy = R * 1.5;
        g.save();
        g.beginPath();
        g.rect(B.l, B.t, B.r - B.l, B.b - B.t);
        g.clip();
        for (let row = 0; B.t + row * dy < B.b + dy; row++)
          for (let col = 0; B.l + col * dx < B.r + dx; col++) {
            const cx = B.l + col * dx + (row % 2 ? dx * 0.5 : 0);
            const cy = B.t + row * dy;
            const v = rnd();
            if (v < 0.18) continue;
            g.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (Math.PI / 3) * k - Math.PI / 2;
              const px = cx + Math.cos(a) * R * 0.94,
                py = cy + Math.sin(a) * R * 0.94;
              k ? g.lineTo(px, py) : g.moveTo(px, py);
            }
            g.closePath();
            g.fillStyle = T.ramp[Math.min(4, (v * 5) | 0)];
            g.globalAlpha = 0.8;
            g.fill();
            g.globalAlpha = 1;
            g.strokeStyle = T.bg;
            g.lineWidth = S * 0.0025;
            g.stroke();
          }
        g.restore();
        T.ramp.forEach((c, k) => {
          g.fillStyle = c;
          g.fillRect(B.l + k * S * 0.05, B.b - S * 0.02, S * 0.046, S * 0.02);
        });
      }

      // isolines: nested closed curves round two centres, no fill between them
      function contourMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        const peaks = [];
        for (let k = 0; k < 2; k++)
          peaks.push([
            B.l + (B.r - B.l) * (0.28 + rnd() * 0.44),
            B.t + (B.b - B.t) * (0.35 + rnd() * 0.4),
            S * (0.1 + rnd() * 0.06),
            rnd() * 6.3,
          ]);
        g.save();
        g.beginPath();
        g.rect(B.l, B.t, B.r - B.l, B.b - B.t);
        g.clip();
        peaks.forEach((p, pi) => {
          for (let lv = 6; lv >= 1; lv--) {
            g.beginPath();
            for (let a = 0; a <= 48; a++) {
              const ang = (a / 48) * Math.PI * 2;
              const wob =
                1 +
                0.16 * Math.sin(ang * 3 + p[3]) +
                0.09 * Math.sin(ang * 5 - p[3] * 2);
              const r = p[2] * lv * 0.42 * wob;
              const px = p[0] + Math.cos(ang) * r,
                py = p[1] + Math.sin(ang) * r * 0.78;
              a ? g.lineTo(px, py) : g.moveTo(px, py);
            }
            g.closePath();
            g.fillStyle = T.ramp[Math.max(0, 4 - lv + (pi ? 0 : 1)) % 5];
            g.globalAlpha = 0.3;
            g.fill();
            g.globalAlpha = 0.85;
            g.strokeStyle = T.ramp[4];
            g.lineWidth = S * 0.0035;
            g.stroke();
            g.globalAlpha = 1;
          }
        });
        g.restore();
        peaks.forEach((p, pi) =>
          txt(
            pi ? "140" : "180",
            p[0],
            p[1] + S * 0.012,
            S * 0.028,
            T.ink,
            "center",
            700,
          ),
        );
      }

      // one line that matters, drawn over the network that does not
      function routeMap(x, y, i) {
        const B = mapFrame(x, y, ST.t, ST.s, i);
        const pts = [];
        let px = B.l + (B.r - B.l) * 0.1,
          py = B.b - (B.b - B.t) * 0.14;
        for (let a = 0; a < 7; a++) {
          pts.push([px, py]);
          px += (B.r - B.l) * (0.08 + rnd() * 0.12);
          py -= (B.b - B.t) * (0.02 + rnd() * 0.16);
        }
        for (let pass = 0; pass < 2; pass++) {
          g.beginPath();
          pts.forEach((p, k) =>
            k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]),
          );
          g.strokeStyle = pass ? T.cat[2] : T.bg;
          g.lineWidth = S * (pass ? 0.014 : 0.026);
          g.lineJoin = "round";
          g.lineCap = "round";
          g.stroke();
        }
        pts.forEach((p, k) => {
          g.fillStyle = k === 0 || k === pts.length - 1 ? T.cat[2] : T.bg;
          g.strokeStyle = T.cat[2];
          g.lineWidth = S * 0.006;
          g.beginPath();
          g.arc(
            p[0],
            p[1],
            S * (k === 0 || k === pts.length - 1 ? 0.02 : 0.012),
            0,
            7,
          );
          g.fill();
          g.stroke();
        });
        txt(
          "start",
          pts[0][0] + S * 0.03,
          pts[0][1] + S * 0.012,
          S * 0.026,
          T.ink,
          "left",
          600,
        );
        txt(
          "340 km",
          pts[pts.length - 1][0] - S * 0.03,
          pts[pts.length - 1][1] - S * 0.02,
          S * 0.026,
          T.ink,
          "right",
          600,
        );
      }

      // geography traded for equal area: one square is one unit, not one place
      function cartogram(x, y, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cols = 8,
          rows = 6;
        const cw = (B.r - B.l) / cols,
          ch = (B.b - B.t) / rows;
        const CODE = ["NG", "ES", "CT", "WS", "SB", "KW", "AF", "BV"];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            // a ragged outline: the grid is a country, not a spreadsheet
            const edge = Math.abs(c - 3.5) / 3.5 + Math.abs(r - 2.5) / 2.5;
            if (edge > 1.25 + rnd() * 0.35) continue;
            const v = rnd();
            g.fillStyle = T.ramp[Math.min(4, (v * 5) | 0)];
            g.fillRect(B.l + c * cw, B.t + r * ch, cw * 0.9, ch * 0.9);
            txt(
              CODE[(c + r) % CODE.length],
              B.l + c * cw + cw * 0.45,
              B.t + r * ch + ch * 0.58,
              S * 0.022,
              v > 0.55 ? T.bg : T.ink,
              "center",
              700,
            );
          }
        T.ramp.forEach((c, k) => {
          g.fillStyle = c;
          g.fillRect(B.l + k * S * 0.05, B.b + S * 0.03, S * 0.046, S * 0.02);
        });
      }

      /* ------------------------------------------------------- the loops
       * Four sequences of six frames, painted into the atlas once. Animating
       * then costs a uniform: the plate is handed a different tile each step.
       * Repainting a tile per frame would mean a canvas redraw and a texture
       * upload sixty times a second, for the same result.
       *
       * None of the four is a kind that appears among the stills, and each
       * carries its own subject: an animated copy of a still would read as the
       * same panel twice, which is the one thing the deck cannot afford.
       */

      // a dial: the needle sweeps a full cycle over the six frames
      function animGauge(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = (B.l + B.r) / 2,
          cy = B.b - (B.b - B.t) * 0.12;
        const R = Math.min((B.r - B.l) * 0.42, (B.b - B.t) * 0.78);
        const a0 = Math.PI,
          a1 = Math.PI * 2;
        g.lineCap = "butt";
        for (let k = 0; k < 5; k++) {
          g.strokeStyle = T.ramp[k];
          g.lineWidth = R * 0.22;
          g.beginPath();
          g.arc(
            cx,
            cy,
            R * 0.82,
            a0 + ((a1 - a0) * k) / 5,
            a0 + ((a1 - a0) * (k + 1)) / 5,
          );
          g.stroke();
        }
        const v = 0.5 + 0.34 * Math.sin(ph * 6.2832 - 1.05);
        const ang = a0 + (a1 - a0) * v;
        g.strokeStyle = T.ink;
        g.lineWidth = S * 0.012;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(ang) * R * 0.72, cy + Math.sin(ang) * R * 0.72);
        g.stroke();
        g.fillStyle = T.ink;
        g.beginPath();
        g.arc(cx, cy, S * 0.018, 0, 7);
        g.fill();
        txt(
          ((v * 100) | 0) + "%",
          cx,
          cy - R * 0.3,
          S * 0.075,
          T.ink,
          "center",
          700,
        );
        txt("of capacity", cx, cy - R * 0.2, S * 0.026, T.mute, "center", 500);
      }

      // a streamgraph, centred, scrolling: the wave travels one period per loop
      function animStream(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        legend(B, ["Cache", "Origin", "Edge", "Retry"], T.cat);
        const n = 40,
          mid = (B.t + B.b) / 2,
          H = (B.b - B.t) * 0.46;
        const co = [];
        for (let k = 0; k < 4; k++)
          co.push([
            0.4 + rnd() * 0.5,
            1 + rnd() * 2,
            rnd() * 6.28,
            1 + rnd() * 3,
            rnd() * 6.28,
          ]);
        const val = (k, t) => {
          const c = co[k];
          return (
            c[0] *
            (1 +
              0.45 * Math.sin(t * c[1] + c[2] + ph * 6.2832) +
              0.3 * Math.sin(t * c[3] + c[4] - ph * 6.2832))
          );
        };
        const lo = new Array(n + 1).fill(0),
          hi = new Array(n + 1).fill(0);
        for (let a = 0; a <= n; a++) {
          let tot = 0;
          for (let k = 0; k < 4; k++) tot += val(k, (a / n) * 6.2832);
          lo[a] = -tot / 2;
        }
        for (let k = 0; k < 4; k++) {
          for (let a = 0; a <= n; a++) hi[a] = lo[a] + val(k, (a / n) * 6.2832);
          g.beginPath();
          for (let a = 0; a <= n; a++)
            (a ? g.lineTo : g.moveTo).call(
              g,
              B.l + ((B.r - B.l) * a) / n,
              mid + lo[a] * H * 0.28,
            );
          for (let a = n; a >= 0; a--)
            g.lineTo(B.l + ((B.r - B.l) * a) / n, mid + hi[a] * H * 0.28);
          g.closePath();
          g.fillStyle = T.cat[k];
          g.globalAlpha = 0.92;
          g.fill();
          g.globalAlpha = 1;
          for (let a = 0; a <= n; a++) lo[a] = hi[a];
        }
      }

      // a node-link graph with a packet running the edges
      function animNetwork(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const nodes = [];
        for (let a = 0; a < 11; a++)
          nodes.push([
            B.l + (B.r - B.l) * (0.1 + rnd() * 0.8),
            B.t + (B.b - B.t) * (0.1 + rnd() * 0.8),
            S * (0.014 + rnd() * 0.022),
          ]);
        const edges = [];
        for (let a = 1; a < nodes.length; a++) edges.push([a, (rnd() * a) | 0]);
        edges.forEach((e) => {
          g.strokeStyle = T.dim;
          g.globalAlpha = 0.7;
          g.lineWidth = S * 0.004;
          g.beginPath();
          g.moveTo(nodes[e[0]][0], nodes[e[0]][1]);
          g.lineTo(nodes[e[1]][0], nodes[e[1]][1]);
          g.stroke();
          g.globalAlpha = 1;
        });
        nodes.forEach((nd, k) => {
          // each node breathes on its own phase: at a glance the graph moves
          const pulse = 1 + 0.34 * Math.sin((ph + k * 0.13) * 6.2832);
          g.fillStyle = T.cat[k % T.cat.length];
          g.globalAlpha = 0.28;
          g.beginPath();
          g.arc(nd[0], nd[1], nd[2] * pulse * 1.9, 0, 7);
          g.fill();
          g.globalAlpha = 1;
          g.beginPath();
          g.arc(nd[0], nd[1], nd[2] * pulse, 0, 7);
          g.fill();
        });
        // one packet per edge, all at the same phase: the graph pulses at once
        edges.forEach((e, k) => {
          const t = (ph + k * 0.09) % 1;
          const a = nodes[e[0]],
            b = nodes[e[1]];
          g.fillStyle = T.dot;
          g.beginPath();
          g.arc(
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            S * 0.015,
            0,
            7,
          );
          g.fill();
        });
      }

      // candles, scrolling two a frame: twelve of them wrap exactly in six
      function animCandles(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        axes(B, null);
        const M = 12,
          series = [];
        let last = 0.5;
        for (let a = 0; a < M; a++) {
          const o = last,
            c = Math.max(0.12, Math.min(0.88, o + (rnd() - 0.5) * 0.3));
          series.push([
            o,
            c,
            Math.max(o, c) + rnd() * 0.09,
            Math.min(o, c) - rnd() * 0.09,
          ]);
          last = c;
        }
        const w = (B.r - B.l) / M;
        for (let a = 0; a < M; a++) {
          const s = series[a].slice();
          if (a === M - 1) {
            // the open holds, the close travels, the wicks follow it
            s[1] = s[0] + (s[1] - s[0]) * (0.15 + 0.85 * Math.sin(ph * 3.1416));
            s[2] = Math.max(s[0], s[1]) + 0.05 * (0.4 + ph);
            s[3] = Math.min(s[0], s[1]) - 0.04 * (0.4 + ph);
          }
          const cx = B.l + w * (a + 0.5);
          const py = (v) => B.b - (B.b - B.t) * v;
          const up = s[1] >= s[0];
          g.strokeStyle = up ? T.cat[4] : T.cat[2];
          g.lineWidth = S * 0.004;
          g.beginPath();
          g.moveTo(cx, py(s[2]));
          g.lineTo(cx, py(s[3]));
          g.stroke();
          g.fillStyle = up ? T.cat[4] : T.cat[2];
          const top = py(Math.max(s[0], s[1])),
            bot = py(Math.min(s[0], s[1]));
          g.fillRect(
            cx - w * 0.28,
            top,
            w * 0.56,
            Math.max(S * 0.006, bot - top),
          );
        }
      }

      // a spider chart, its shape breathing under a sweeping arm
      function animRadar(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = (B.l + B.r) / 2,
          cy = (B.t + B.b) / 2;
        const R = Math.min(B.r - B.l, B.b - B.t) * 0.44;
        const n = 6,
          pt = (k, r) => [
            cx + Math.cos((k / n) * 6.2832 - 1.5708) * r,
            cy + Math.sin((k / n) * 6.2832 - 1.5708) * r,
          ];
        for (let ring = 1; ring <= 4; ring++) {
          g.beginPath();
          for (let k = 0; k <= n; k++) {
            const q = pt(k, (R * ring) / 4);
            k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
          }
          g.strokeStyle = T.grid;
          g.lineWidth = S * 0.003;
          g.stroke();
        }
        const base = [];
        for (let k = 0; k < n; k++) base.push(0.35 + rnd() * 0.6);
        g.beginPath();
        for (let k = 0; k <= n; k++) {
          const v =
            base[k % n] * (0.86 + 0.16 * Math.sin((ph + k * 0.14) * 6.2832));
          const q = pt(k, R * v);
          k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
        }
        g.closePath();
        g.fillStyle = T.cat[0];
        g.globalAlpha = 0.42;
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = T.cat[0];
        g.lineWidth = S * 0.008;
        g.stroke();
        // the arm goes round once per loop
        const a = ph * 6.2832 - 1.5708;
        g.strokeStyle = T.dot;
        g.lineWidth = S * 0.006;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        g.stroke();
        for (let k = 0; k < n; k++) {
          const q = pt(k, R * 1.14);
          txt(
            PLACES[k % PLACES.length],
            q[0],
            q[1],
            S * 0.022,
            T.mute,
            "center",
            500,
          );
        }
      }

      // a wind rose: twelve sectors, turning one sector over the loop so it
      // comes back to itself exactly
      function animRose(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const cx = (B.l + B.r) / 2,
          cy = (B.t + B.b) / 2;
        const R = Math.min(B.r - B.l, B.b - B.t) * 0.46;
        const n = 12,
          seg = 6.2832 / n,
          spin = ph * seg;
        const val = [];
        for (let k = 0; k < n; k++) val.push(0.3 + rnd() * 0.68);
        for (let k = 0; k < n; k++) {
          const a0 = k * seg + spin - 1.5708,
            a1 = a0 + seg * 0.9;
          for (let ring = 3; ring >= 1; ring--) {
            g.beginPath();
            g.moveTo(cx, cy);
            g.arc(cx, cy, R * val[k] * (ring / 3), a0, a1);
            g.closePath();
            g.fillStyle = T.ramp[ring + 1];
            g.fill();
          }
        }
        g.strokeStyle = T.grid;
        g.lineWidth = S * 0.003;
        for (let ring = 1; ring <= 3; ring++) {
          g.beginPath();
          g.arc(cx, cy, (R * ring) / 3, 0, 7);
          g.stroke();
        }
        ["N", "E", "S", "W"].forEach((c, k) => {
          const a = k * 1.5708 - 1.5708;
          txt(
            c,
            cx + Math.cos(a) * R * 1.16,
            cy + Math.sin(a) * R * 1.16 + S * 0.008,
            S * 0.026,
            T.mute,
            "center",
            600,
          );
        });
      }

      // source to programme: ribbons with the flow running along them
      function animSankey(x, y, ph, i) {
        const B = frame(x, y, ST.t, ST.s, i);
        const xl = B.l + S * 0.06,
          xr = B.r - S * 0.06,
          w = S * 0.055;
        const L = 3,
          R = 4;
        const lh = (B.b - B.t) / L,
          rh = (B.b - B.t) / R;
        for (let a = 0; a < L; a++) {
          g.fillStyle = T.cat[a % T.cat.length];
          g.fillRect(xl, B.t + a * lh + lh * 0.08, w, lh * 0.84);
        }
        for (let b = 0; b < R; b++) {
          g.fillStyle = T.dim;
          g.fillRect(xr - w, B.t + b * rh + rh * 0.08, w, rh * 0.84);
        }
        g.lineCap = "butt";
        for (let a = 0; a < L; a++)
          for (let b = 0; b < R; b++) {
            if (rnd() < 0.35) continue;
            const y0 = B.t + a * lh + lh * (0.2 + rnd() * 0.6);
            const y1 = B.t + b * rh + rh * (0.2 + rnd() * 0.6);
            const mid = (xl + w + xr - w) / 2;
            g.beginPath();
            g.moveTo(xl + w, y0);
            g.bezierCurveTo(mid, y0, mid, y1, xr - w, y1);
            g.strokeStyle = T.cat[a % T.cat.length];
            g.globalAlpha = 0.3;
            g.lineWidth = S * (0.012 + rnd() * 0.026);
            g.stroke();
            // the dashes travel one full period over the loop, so it wraps
            g.globalAlpha = 0.9;
            g.setLineDash([S * 0.016, S * 0.03]);
            g.lineDashOffset = -ph * S * 0.092;
            g.lineWidth = S * 0.005;
            g.stroke();
            g.setLineDash([]);
            g.globalAlpha = 1;
          }
      }

      const LOOPS = [
        animGauge,
        animStream,
        animNetwork,
        animCandles,
        animRadar,
        animRose,
        animSankey,
      ];

      const KINDS = [
        grouped,
        (x, y, i) => choro(x, y, T.ramp, i),
        multiline,
        bubbleMap,
        ranked,
        (x, y, i) => heat(x, y, T.ramp, i),
        dotMap,
        stackedArea,
        scatterR,
        flowMap,
        diverging,
        donut,
        histogram,
        slope,
        dumbbell,
        waffle,
        boxplot,
        radialBar,
        treemap,
        sparkGrid,
        pyramid,
        hexMap,
        contourMap,
        routeMap,
        cartogram,
      ];

      for (let i = 0; i < N * N; i++) {
        const x = (i % N) * S,
          y = ((i / N) | 0) * S;
        // grounds are dealt so no two neighbours share one, across or down
        T = THEMES[(i * 5 + ((i / N) | 0)) % THEMES.length];
        g.save();
        g.beginPath();
        g.rect(x, y, S, S);
        g.clip();
        const tell = (d, k) => {
          ST = { t: d[0], s: d[1], f: d[2], src: d[3], c: k };
        };
        if (i < STILLS) {
          // one kind and one story per still, in step: with twenty-five of each
          // no subject and no chart type appears twice in the deck
          tell(STORIES[i % STORIES.length], i);
          KINDS[i % KINDS.length](x, y, i);
        } else if (i < STILLS + SEQS * FRAMES) {
          // a sequence's frames must be the same chart from the same draw, so
          // the generator is reset to the sequence's own seed on every frame
          const q = i - STILLS,
            sq = (q / FRAMES) | 0,
            fr = q % FRAMES;
          T = THEMES[(sq * 2 + 1) % THEMES.length];
          seed = 101 + sq * 7919;
          tell(SEQ_STORIES[sq], sq + 1);
          // the sequence's index, not the tile's: the chrome reads it for the
          // file name, and with the tile index the name changed on every frame
          // of the loop while the chart underneath stayed put
          LOOPS[sq](x, y, fr / FRAMES, STILLS + sq);
        } else {
          tell(STORIES[i % STORIES.length], i);
          KINDS[i % KINDS.length](x, y, i);
        }
        chromeEdge(x, y);
        g.restore();
      }
      return cv;
    }

    /* ------------------------------------------------------- the front page
     * Typeset once, into a canvas, and uploaded as a mipmapped texture. Doing
     * it as real type rather than as procedural bars is the whole point: the
     * glass has to have something worth reading in it.
     */
    function buildPage() {
      const W = PAGE_RES,
        H = Math.round(PAGE_RES * 1.414);
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const g = cv.getContext("2d");
      const SERIF = '"Times New Roman", Times, Georgia, serif';
      const A = ARTICLE;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#111111";
      g.textBaseline = "alphabetic";

      const M = Math.round(W * 0.052),
        inner = W - 2 * M;
      const R = Math.round;

      /* Set to fit, not to a fixed size. Eleven papers do not share a name
       * length, and neither do their headlines: the size is walked down until
       * the line fits its measure, and the font is left set. */
      const fit = (text, weight, start, max) => {
        let s = start;
        for (;;) {
          g.font = weight + " " + R(s) + "px " + SERIF;
          if (g.measureText(text).width <= max || s < 9) return R(s);
          s *= 0.94;
        }
      };
      const rule = (x, y, w, h) => g.fillRect(R(x), R(y), R(w), R(h));

      /* Letter-spaced, drawn glyph by glyph. A monthly sets its name in wide
       * caps and a canvas has no tracking, so the alternative is a masthead
       * that reads like body copy. */
      const track = (text, cx, y, sp, font) => {
        if (font) g.font = font;
        const cs = [...text];
        let w = -sp;
        for (const c of cs) w += g.measureText(c).width + sp;
        const al = g.textAlign;
        g.textAlign = "left";
        let x = cx - w / 2;
        for (const c of cs) {
          g.fillText(c, x, y);
          x += g.measureText(c).width + sp;
        }
        g.textAlign = al;
      };

      /* The cut. Not a photograph — a plate: the block is a piece of glass at
       * arm's length and a halftone would only ever read as a grey rectangle,
       * so it is a lit gradient with a subject in it, and its caption. */
      const cut = (x, y, w, h, caption, fs, lh) => {
        const grd = g.createLinearGradient(x, y, x + w * 0.6, y + h);
        grd.addColorStop(0.0, "#8e8e8e");
        grd.addColorStop(0.55, "#3a3a3a");
        grd.addColorStop(1.0, "#6f6f6f");
        g.fillStyle = "#ffffff";
        g.fillRect(R(x - 4), R(y - 8), R(w + 8), R(h + lh * 2.2));
        g.fillStyle = grd;
        g.fillRect(R(x), R(y), R(w), R(h));
        g.fillStyle = "#c9c9c9";
        g.beginPath();
        g.ellipse(
          x + w * 0.62,
          y + h * 0.52,
          w * 0.19,
          h * 0.3,
          0,
          0,
          Math.PI * 2,
        );
        g.fill();
        g.fillStyle = "#111111";
        g.textAlign = "center";
        // une gravure d'une colonne porte la même légende qu'une pleine page :
        // sans calage elle déborde sur la colonne d'à côté
        if (caption) {
          let cs = fs * 0.94;
          for (;;) {
            g.font = "italic " + R(cs) + "px " + SERIF;
            if (g.measureText(caption).width <= w * 0.96 || cs < 7) break;
            cs *= 0.93;
          }
          g.fillText(caption, x + w / 2, y + h + lh * 1.15);
        }
        g.textAlign = "left";
        g.fillRect(R(x), R(y + h + lh * 1.6), R(w), 1);
      };

      /* The one thing every press shares: break the body once at the column
       * measure, then pour it. Everything above the columns is what makes a
       * broadsheet a broadsheet and a penny paper a penny paper.
       */
      const flow = (o) => {
        const { cols, colW, gut, left, top, bot, fs, lh, drop } = o;
        const plate = o.plate;
        const bodyFont = R(fs) + "px " + SERIF;
        g.textAlign = "left";

        const DROPN = 3;
        let dropCh = "",
          dropW = 0,
          dropSize = 0;
        if (drop) {
          const b0 = A.body.find((b) => !b.h);
          dropCh = b0 ? b0.t.charAt(0) : "";
          dropSize = R(lh * DROPN * 0.82);
          g.font = "700 " + dropSize + "px " + SERIF;
          dropW = g.measureText(dropCh).width + fs * 0.24;
        }

        const lines = [];
        let firstPara = true;
        let started = false; // un intertitre avant le premier paragraphe
        // redit le titre, et sous une lettrine il lui
        // rentre dedans : il ne descend pas sur la page
        for (const blk of A.body) {
          if (blk.h) {
            if (started) lines.push({ head: true, text: blk.t });
            continue;
          }
          started = true;
          g.font = bodyFont;
          let ws = blk.t.split(/\s+/).filter(Boolean);
          if (firstPara && drop && ws.length)
            ws = [ws[0].slice(1)].concat(ws.slice(1)).filter(Boolean);
          let i = 0,
            first = true;
          while (i < ws.length) {
            const di = drop && lines.length < DROPN ? dropW : 0;
            const indent = (first && !drop ? fs * 1.1 : 0) + di;
            const line = [];
            let w = indent;
            while (i < ws.length) {
              const add = g.measureText((line.length ? " " : "") + ws[i]).width;
              if (w + add > colW && line.length) break;
              line.push(ws[i]);
              w += add;
              i++;
            }
            lines.push({ words: line, indent, justify: i < ws.length });
            first = false;
          }
          firstPara = false;
        }

        let li = 0;
        for (let c = 0; c < cols && li < lines.length; c++) {
          const x0 = left + c * (colW + gut);
          let ly = top + fs;
          while (ly < bot && li < lines.length) {
            if (
              plate &&
              x0 + colW > plate.x + 1 &&
              x0 < plate.x + plate.w - 1 &&
              ly > plate.y &&
              ly - fs < plate.y + plate.h
            ) {
              ly += lh;
              continue;
            }
            const L = lines[li++];
            if (L.head) {
              // calé sur la colonne : à six colonnes, un intertitre de trente
              // caractères passe par-dessus ses deux voisines
              let ts = fs * 1.02;
              for (;;) {
                g.font = "700 " + R(ts) + "px " + SERIF;
                if (g.measureText(L.text).width <= colW || ts < 6) break;
                ts *= 0.93;
              }
              g.textAlign = "center";
              g.fillText(L.text, x0 + colW / 2, ly + fs * 0.2);
              g.textAlign = "left";
              ly += lh * 1.5;
              continue;
            }
            g.font = bodyFont;
            if (!L.justify || L.words.length === 1) {
              g.fillText(L.words.join(" "), x0 + L.indent, ly);
            } else {
              const wd = L.words.map((w) => g.measureText(w).width);
              const gap =
                (colW - L.indent - wd.reduce((a, b) => a + b, 0)) /
                (L.words.length - 1);
              let cx = x0 + L.indent;
              for (let k = 0; k < L.words.length; k++) {
                g.fillText(L.words[k], cx, ly);
                cx += wd[k] + gap;
              }
            }
            ly += lh;
          }
        }

        if (drop && dropCh) {
          g.font = "700 " + dropSize + "px " + SERIF;
          g.fillText(dropCh, left, top + fs + lh * (DROPN - 1) * 0.98);
        }
        if (plate) cut(plate.x, plate.y, plate.w, plate.h, A.cap, fs, lh);
      };

      /* Five presses. What separates them is not decoration: it is the
       * measure, the number of columns, where the weight sits on the page, and
       * whether there is a plate at all. A tabloid is one enormous line and two
       * wide columns; a penny paper is six columns of six-point and a stacked
       * deck; a monthly is air. Set the same article in all five and it reads
       * as five different papers, which is the point.
       */
      const PRESS = {
        // one masthead across the top, a centred deck, three columns, a plate
        // straddling the two on the right
        broadsheet() {
          g.textAlign = "center";
          fit(A.paper, "700", W * 0.08, inner);
          g.fillText(A.paper, W / 2, R(H * 0.055));
          let y = R(H * 0.062);
          rule(M, y, inner, 3);
          y += 9;
          rule(M, y, inner, 1);
          y += R(W * 0.026);
          g.textAlign = "left";
          fit(A.date, "400", W * 0.016, inner * 0.45);
          g.fillText(A.date, M, y);
          g.textAlign = "right";
          fit(A.by, "400", W * 0.016, inner * 0.5);
          g.fillText(A.by, W - M, y);
          y += 10;
          rule(M, y, inner, 1);
          y += R(W * 0.05);
          g.textAlign = "center";
          let hs = W * 0.058;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "700", W * 0.058, inner));
          g.font = "700 " + R(hs) + "px " + SERIF;
          g.fillText(A.head[0], W / 2, y);
          for (let i = 1; i < A.head.length; i++) {
            y += R(hs * 1.1);
            g.fillText(A.head[i], W / 2, y);
          }
          y += R(W * 0.034);
          fit(A.sub, "400", W * 0.021, inner * 0.94);
          g.fillText(A.sub, W / 2, y);
          y += 12;
          rule(M + inner * 0.3, y, inner * 0.4, 1);
          const fs = R(W * 0.0235),
            lh = R(fs * 1.42);
          const cols = A.cols || 3,
            gut = R(W * 0.024),
            colW = (inner - gut * (cols - 1)) / cols;
          const top = y + R(W * 0.03),
            bot = H - R(H * 0.038);
          flow({
            cols,
            colW,
            gut,
            left: M,
            top,
            bot,
            fs,
            lh,
            plate: {
              x: M + colW + gut,
              w: colW * 2 + gut,
              y: top + lh * 12,
              h: R(lh * 9.5),
            },
          });
          rule(M, H - R(H * 0.03), inner, 2);
        },

        // the name reversed out of a black band, one line of type as big as it
        // will go, and a plate across the whole measure
        tabloid() {
          const band = R(H * 0.082);
          g.fillStyle = "#111111";
          g.fillRect(0, 0, W, band);
          g.fillStyle = "#ffffff";
          g.textAlign = "center";
          const name = A.paper.toUpperCase();
          fit(name, "700", W * 0.085, inner * 0.96);
          g.fillText(name, W / 2, R(band * 0.72));
          g.fillStyle = "#111111";
          let y = band + R(W * 0.032);
          g.textAlign = "left";
          fit(A.date, "400", W * 0.017, inner * 0.45);
          g.fillText(A.date, M, y);
          g.textAlign = "right";
          fit(A.by, "400", W * 0.017, inner * 0.45);
          g.fillText(A.by, W - M, y);
          y += 8;
          rule(M, y, inner, 2);
          y += R(W * 0.078);
          g.textAlign = "left";
          let hs = W * 0.125;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "700", W * 0.125, inner));
          g.font = "700 " + R(hs) + "px " + SERIF;
          g.fillText(A.head[0], M, y);
          for (let i = 1; i < A.head.length; i++) {
            y += R(hs * 0.92);
            g.fillText(A.head[i], M, y);
          }
          y += R(W * 0.03);
          fit(A.sub, "400", W * 0.024, inner);
          g.fillText(A.sub, M, y);
          const fs = R(W * 0.0245),
            lh = R(fs * 1.44);
          y += R(W * 0.026);
          const ph = { x: M, y: y, w: inner, h: R(H * 0.19) };
          cut(ph.x, ph.y, ph.w, ph.h, A.cap, fs, lh);
          const top = ph.y + ph.h + R(lh * 2.4),
            bot = H - R(H * 0.05);
          const cols = A.cols || 2,
            gut = R(W * 0.026),
            colW = (inner - gut * (cols - 1)) / cols;
          flow({ cols, colW, gut, left: M, top, bot, fs, lh });
          g.fillStyle = "#111111";
          g.fillRect(0, H - R(H * 0.022), W, R(H * 0.022));
        },

        // air. a small tracked name, a title set in the same face as the body,
        // an italic line under it, and a drop cap
        monthly() {
          g.textAlign = "center";
          const ms = fit(A.paper.toUpperCase(), "400", W * 0.03, inner * 0.62);
          track(A.paper.toUpperCase(), W / 2, R(H * 0.052), ms * 0.42);
          let y = R(H * 0.062);
          rule(W / 2 - inner * 0.11, y, inner * 0.22, 1);
          y += R(W * 0.085);
          let hs = W * 0.07;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "400", W * 0.07, inner * 0.86));
          g.font = "400 " + R(hs) + "px " + SERIF;
          g.fillText(A.head[0], W / 2, y);
          for (let i = 1; i < A.head.length; i++) {
            y += R(hs * 1.16);
            g.fillText(A.head[i], W / 2, y);
          }
          y += R(W * 0.044);
          const ss = fit(A.sub, "400", W * 0.0215, inner * 0.8);
          g.font = "italic " + ss + "px " + SERIF;
          g.fillText(A.sub, W / 2, y);
          y += R(W * 0.036);
          const bs = R(W * 0.016);
          track(A.by, W / 2, y, bs * 0.5, "400 " + bs + "px " + SERIF);
          y += R(W * 0.052);
          const fs = R(W * 0.0255),
            lh = R(fs * 1.55);
          const cols = A.cols || 2,
            gut = R(W * 0.05);
          const measure = cols === 1 ? inner * 0.72 : inner;
          const colW = (measure - gut * (cols - 1)) / cols;
          const left = M + (inner - measure) / 2;
          const top = y,
            bot = H - R(H * 0.05);
          flow({
            cols,
            colW,
            gut,
            left,
            top,
            bot,
            fs,
            lh,
            drop: true,
            plate:
              A.cut === "square"
                ? {
                    x: left + measure - colW,
                    w: colW,
                    y: top + lh * 15,
                    h: R(colW * 0.72),
                  }
                : null,
          });
        },

        // six point, six columns, hairlines between them and a deck that steps
        // down a size a line at a time. no plate: the presses of 1835 had none
        penny() {
          g.textAlign = "center";
          let y = R(H * 0.038);
          rule(M, R(H * 0.016), inner, 1);
          fit(A.paper, "700", W * 0.05, inner * 0.78);
          g.fillText(A.paper, W / 2, y);
          y += 8;
          rule(M, y, inner, 3);
          y += 7;
          rule(M, y, inner, 1);
          y += R(W * 0.024);
          const ds = R(W * 0.0145);
          g.font = ds + "px " + SERIF;
          g.textAlign = "left";
          g.fillText(A.date, M, y);
          g.textAlign = "center";
          g.fillText("PRICE ONE PENNY", W / 2, y);
          g.textAlign = "right";
          g.fillText(A.by, W - M, y);
          y += 7;
          rule(M, y, inner, 1);
          y += R(W * 0.034);
          g.textAlign = "center";
          const deck = A.head.concat([A.sub]);
          let size = W * 0.044;
          for (let i = 0; i < deck.length; i++) {
            const w = i === deck.length - 1 ? "400" : "700";
            const s = fit(deck[i], w, size, inner * 0.6);
            g.fillText(deck[i], W / 2, y);
            y += R(s * 1.2);
            if (i < deck.length - 1)
              rule(W / 2 - inner * 0.045, y - R(s * 0.42), inner * 0.09, 1);
            size *= 0.66;
          }
          y += R(W * 0.014);
          const fs = R(W * 0.0175),
            lh = R(fs * 1.34);
          const cols = A.cols || 5,
            gut = R(W * 0.016),
            colW = (inner - gut * (cols - 1)) / cols;
          const top = y,
            bot = H - R(H * 0.032);
          for (let c = 1; c < cols; c++)
            rule(
              M + c * (colW + gut) - gut / 2,
              top - R(lh * 0.5),
              1,
              bot - top + R(lh * 0.6),
            );
          flow({ cols, colW, gut, left: M, top, bot, fs, lh });
          rule(M, H - R(H * 0.024), inner, 1);
        },

        // the weight on the left: name and headline ranged left, a ruled box
        // for the dateline top right, a plate in the first column, and the last
        // column tinted as a rail
        rail() {
          g.textAlign = "left";
          fit(A.paper, "700", W * 0.062, inner * 0.6);
          g.fillText(A.paper, M, R(H * 0.05));
          const bx = M + inner * 0.64,
            bw = inner * 0.36,
            bt = R(H * 0.022),
            bh = R(H * 0.034);
          rule(bx, bt, bw, 1);
          rule(bx, bt + bh, bw, 1);
          g.textAlign = "right";
          fit(A.date, "400", W * 0.015, bw * 0.92);
          g.fillText(A.date, W - M, bt + R(bh * 0.44));
          fit(A.by, "400", W * 0.015, bw * 0.92);
          g.fillText(A.by, W - M, bt + R(bh * 0.9));
          let y = R(H * 0.058);
          rule(M, y, inner, 2);
          y += R(W * 0.048);
          g.textAlign = "left";
          let hs = W * 0.072;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "700", W * 0.072, inner * 0.76));
          g.font = "700 " + R(hs) + "px " + SERIF;
          g.fillText(A.head[0], M, y);
          for (let i = 1; i < A.head.length; i++) {
            y += R(hs * 1.02);
            g.fillText(A.head[i], M, y);
          }
          y += R(W * 0.028);
          const ss = fit(A.sub, "400", W * 0.0195, inner * 0.76);
          g.font = "italic " + ss + "px " + SERIF;
          g.fillText(A.sub, M, y);
          y += 12;
          rule(M, y, inner * 0.5, 1);
          const fs = R(W * 0.0215),
            lh = R(fs * 1.4);
          const cols = A.cols || 4,
            gut = R(W * 0.022),
            colW = (inner - gut * (cols - 1)) / cols;
          const top = y + R(W * 0.03),
            bot = H - R(H * 0.035);
          g.fillStyle = "#eeeeee";
          g.fillRect(
            R(M + (cols - 1) * (colW + gut) - gut * 0.35),
            R(top - lh * 0.9),
            R(colW + gut * 0.7),
            R(bot - top + lh * 1.4),
          );
          g.fillStyle = "#111111";
          flow({
            cols,
            colW,
            gut,
            left: M,
            top,
            bot,
            fs,
            lh,
            plate: { x: M, w: colW, y: top + lh * 2, h: R(colW * 1.2) },
          });
          rule(M, H - R(H * 0.026), inner, 1);
        },
      };

      (PRESS[A.tpl] || PRESS.broadsheet)();
      // the sheet, before the glass gets to it — the only way to read a press
      // is to look at the page flat
      window.__page = cv;
      return cv;
    }

    /* ----------------------------------------------------------- the galley
     * The hero is paper coming off a press, and a web of newsprint has no page
     * boundary — so what the webs carry cannot be a front page. It is a
     * GALLEY: one measure, the eleven papers following one another down the
     * column with their mastheads between them.
     *
     * Three galleys are set SIDE BY SIDE into one texture. Three webs then
     * cost one upload rather than three, and each reads its own column at its
     * own offset. Only v repeats; u is clamped and the columns are set apart
     * by a strip of dead paper, so no column can bleed into its neighbour
     * under a mipmap.
     *
     * Every paper is set by ITS OWN PRESS. Each article names one in `tpl` and
     * the five are the five the front page knows. What separates them is what
     * separates them on a page, and none of it is decoration: where the name
     * sits and how it is set, what the rules do, whether the headline is
     * centred or ranged left and in which face, and what furniture the press
     * carries at all.
     *
     * A slot is AS TALL AS ITS ARTICLE, measured before anything is drawn. The
     * first version gave every press a hand-written weight, and a paper whose
     * body ran out before its slot did left a hole — which no newspaper has,
     * because the column simply goes on. The three columns hold the same
     * eleven articles in three orders, so their totals agree and one lap is
     * exactly the texture's height however the measuring comes out. That is
     * what keeps the loop seamless.
     */
    /* THE THREE WEBS RUN AS ONE, A PAGE APART.
     *
     * They used to run at rates a tenth apart and start a third of the reel
     * apart, so at any moment the frame held three eras at once — 1835 beside
     * 1900 beside today. That reads as a spread of dates and not as an
     * evolution, which is the whole thing the reel is for. Set one page apart
     * and driven at one rate, the frame carries pages n, n+1 and n+2: the
     * order is legible across the frame, and the whole of it moves through the
     * ramp together.
     *
     * The rates must be EQUAL for that to hold. A tenth of drift is invisible
     * for a few seconds and has the columns out of order a minute later. */
    /* THE THREE WEBS DO NOT RUN AT THE SAME SPEED. A press is three
     * separate reels through three sets of rollers, and holding them to the
     * same rate to four decimal places is the one thing a real one never
     * does. A few per cent apart is enough: near enough that no column
     * looks like it is racing, far enough that the set never settles into a
     * pattern — the lag between any two of them is always changing, so an
     * alignment that happens once does not happen again on the next lap.
     * They live in P rather than here so the bench can move them: what a
     * set of three should be is a thing to look at, not to reason about. */
    let PAGE_STEP = 1 / 30; // one page, as a fraction of the reel

    /* ------------------------------------------------------------ the reel
     * The webs used to carry eleven papers dealt into three columns by three
     * strides. They carry a TIMELINE now: one column that runs through the
     * history of the form, from a penny paper of 1835 that had no pictures at
     * all, through the presses that learned to print a photograph, to what a
     * desk makes today — and the three webs read that one column at three
     * different heights, so three eras are always in the frame at once.
     *
     * It loops. At the end of the run the press starts again at 1835, which is
     * a seam, and an accepted one: the alternative is a reel long enough that
     * a lap never comes round, and that reel is a hundred megabytes of
     * texture. One column instead of three is what pays for the length there
     * is — a third of the width buys three times the history for the same
     * bytes, and it is also what guarantees the three webs are never showing
     * the same page.
     *
     * The modern end is not invented journalism. It is the atlas hero.js
     * already paints for the field of plates — real charts, real maps, drawn
     * in canvas — copied a tile at a time onto the paper. What the reel ends
     * on is literally what the tool makes.
     */
    /* ------------------------------------------------------- the templates
     * Thirty page layouts, six to a rung, drawn with placeholder copy and
     * placeholder pictures so the STRUCTURE can be judged before any content
     * goes near it.
     *
     * One painter, thirty specifications. Thirty functions would be thirty
     * places to fix the same spacing bug, and the six pages of a rung have to
     * differ by their skeleton — where the name sits, how many columns, what
     * shape the block is and where it falls — not by their words.
     *
     * The rungs are constraints, and the painter enforces them rather than
     * trusting the specs: rung one may carry no block at all, rung two's
     * blocks are one ink, rung three's may have colour, rung four's charts are
     * held to a column, and rung five is where a block may take the measure.
     */
    /* THE COLUMNS SAY WHAT THIS IS.
     *
     * They were lorem, which is the right thing while a layout is being
     * judged and the wrong thing the moment anyone can read a word of it —
     * a reader who leans in gets nothing back. The mastheads and the
     * headlines stay playful, because a press full of invented papers is
     * part of the joke; the body is the argument, set small, and true.
     */
    const LOREM = (
      "Your desk already writes the story. What it does not do is draw it. " +
      "Between the reporting being finished and the page going out there is " +
      "a gap, and the gap is filled by a request to somebody else, a queue, " +
      "and a wait. Splash closes it. It teaches the assistant your newsroom " +
      "already uses to make the graphic itself: a chart, a map, a piece of " +
      "motion, a scrollytelling passage, built from the reporting you have " +
      "done and nothing you have to gather again. " +
      "It is not a chart tool bolted to a chat window. It reads the story " +
      "and the data together, works out what the evidence will actually " +
      "support, and proposes the form that says it — a line where a line is " +
      "honest, a map where the story is about somewhere, a unit chart where " +
      "the count is the point. You choose the direction. The desk keeps the " +
      "decisions it should keep. " +
      "The draft comes back for review before anything is published, and " +
      "what comes out is the finished thing in the shape the page needs: " +
      "print at the right measure, web that holds on a phone, video for the " +
      "feeds, a scrolling piece for the site. One story, the formats it has " +
      "to be in, and no second brief. " +
      "None of it invents a number. The graphic carries where its figures " +
      "came from, and it carries them because a graphic that cannot say " +
      "where it got something is not evidence, it is decoration. The source " +
      "line is written by the tool, not remembered by a person at eleven at " +
      "night. " +
      "What it changes is who can make a graphic at all. A desk with one " +
      "designer makes as many as one designer can draw; a desk with this " +
      "makes as many as it has stories worth drawing. The visual work stops " +
      "being a favour asked of another department and becomes part of " +
      "writing the piece — which is where it belonged before anyone had to " +
      "ask for it. "
    ).repeat(3);

    /* Invented papers, and the odd one that is a joke about the trade. */
    const LOREM_HEAD = [
      "Reporting in, graphics out",
      "The desk that draws its own",
      "A map where the story is",
      "Nobody waits for the chart",
      "What the evidence supports",
      "The source line writes itself",
      "One story, every format",
      "Held to the reporting",
    ];

    /* head — where the paper's name goes and what it does to the page.
     * cols  — the measure, divided.
     * drop  — a decorated initial on the first paragraph.
     * blocks— rectangles the text flows around. col and span are in columns,
     *         at and lines are in lines of the column they sit in.
     * kind  — photo, chart or map, which is what the placeholder draws.
     * tone  — ink for one colour, or a hex for a page that has a second.
     */
    const SPECS = [
      // ---- 1 · text alone. No block may appear on any of these.
      {
    rung: 1,
    name: "Single measure, centred name",
    head: "centre",
    cols: 1,
    blocks: [],
      },
      {
    rung: 1,
    name: "Two columns under a banner",
    head: "band",
    cols: 2,
    blocks: [],
      },
      {
    rung: 1,
    name: "Three columns, hairlines",
    head: "centre",
    cols: 3,
    blocks: [],
      },
      {
    rung: 1,
    name: "Two columns, decorated initial",
    head: "tracked",
    cols: 2,
    drop: true,
    blocks: [],
      },
      {
    rung: 1,
    name: "One column, all air",
    head: "tracked",
    cols: 1,
    drop: true,
    blocks: [],
      },
      {
    rung: 1,
    name: "Four columns, six point",
    head: "left",
    cols: 4,
    blocks: [],
      },

      // ---- 2 · text and a black-and-white
      {
    rung: 2,
    name: "Plate across the measure",
    head: "centre",
    cols: 2,
    blocks: [{ kind: "photo", col: 0, span: 2, at: 0, lines: 9 }],
      },
      {
    rung: 2,
    name: "Plate heads the second column",
    head: "centre",
    cols: 2,
    blocks: [{ kind: "photo", col: 1, span: 1, at: 0, lines: 11 }],
      },
      {
    rung: 2,
    name: "One measure, plate set into it",
    head: "band",
    cols: 1,
    blocks: [{ kind: "photo", col: 0, span: 1, at: 6, lines: 9 }],
      },
      {
    rung: 2,
    name: "Portrait beside the opening",
    head: "left",
    cols: 2,
    blocks: [{ kind: "photo", col: 0, span: 1, at: 3, lines: 13 }],
      },
      {
    rung: 2,
    name: "Two plates, one over the other",
    head: "tracked",
    cols: 2,
    blocks: [
      { kind: "photo", col: 1, span: 1, at: 0, lines: 7 },
      { kind: "photo", col: 1, span: 1, at: 12, lines: 7 },
    ],
      },
      {
    rung: 2,
    name: "Plate at the foot, full measure",
    head: "centre",
    cols: 3,
    blocks: [{ kind: "photo", col: 0, span: 3, at: 14, lines: 8 }],
      },

      // ---- 3 · the same, with a second ink
      {
    rung: 3,
    name: "Colour plate across the measure",
    head: "centre",
    cols: 2,
    tone: "#b3402a",
    blocks: [
      { kind: "photo", col: 0, span: 2, at: 0, lines: 10, colour: true },
    ],
      },
      {
    rung: 3,
    name: "Colour cover, name reversed",
    head: "band",
    cols: 2,
    tone: "#1a2ffb",
    blocks: [
      { kind: "photo", col: 0, span: 2, at: 0, lines: 13, colour: true },
    ],
      },
      {
    rung: 3,
    name: "One measure, colour plate on top",
    head: "centre",
    cols: 1,
    tone: "#b3402a",
    blocks: [{ kind: "photo", col: 0, span: 1, at: 0, lines: 11, colour: true }],
      },
      {
    rung: 3,
    name: "Two colour plates",
    head: "left",
    cols: 2,
    tone: "#1a7a4a",
    blocks: [
      { kind: "photo", col: 0, span: 1, at: 2, lines: 8, colour: true },
      { kind: "photo", col: 1, span: 1, at: 9, lines: 8, colour: true },
    ],
      },
      {
    rung: 3,
    name: "Colour at the foot",
    head: "tracked",
    cols: 2,
    tone: "#b3402a",
    blocks: [
      { kind: "photo", col: 0, span: 2, at: 13, lines: 9, colour: true },
    ],
      },
      {
    rung: 3,
    name: "Colour plate, portrait, ranged left",
    head: "left",
    cols: 3,
    tone: "#1a2ffb",
    blocks: [
      { kind: "photo", col: 0, span: 1, at: 1, lines: 14, colour: true },
    ],
      },

      // ---- 4 · text, a picture, and small charts kept in their place
      {
    rung: 4,
    name: "Photograph up, chart down a column",
    head: "centre",
    cols: 3,
    tone: "#b3402a",
    blocks: [
      { kind: "photo", col: 0, span: 2, at: 0, lines: 8, colour: true },
      { kind: "chart", col: 2, span: 1, at: 6, lines: 6 },
    ],
      },
      {
    rung: 4,
    name: "Locator map, inset",
    head: "left",
    cols: 3,
    tone: "#1a2ffb",
    blocks: [
      { kind: "photo", col: 0, span: 1, at: 2, lines: 9, colour: true },
      { kind: "map", col: 2, span: 1, at: 4, lines: 5 },
    ],
      },
      {
    rung: 4,
    name: "Two charts down the second column",
    live: 0,
    anim: "bars",
    head: "centre",
    cols: 3,
    tone: "#b3402a",
    blocks: [
      { kind: "chart", col: 1, span: 1, at: 3, lines: 5 },
      { kind: "chart", col: 1, span: 1, at: 12, lines: 5 },
    ],
      },
      {
    rung: 4,
    name: "Chart at the foot of the measure",
    head: "band",
    cols: 2,
    tone: "#1a2ffb",
    blocks: [
      { kind: "photo", col: 0, span: 1, at: 1, lines: 8, colour: true },
      { kind: "chart", col: 0, span: 2, at: 16, lines: 6 },
    ],
      },
      {
    rung: 4,
    name: "Map and photograph, side by side",
    head: "centre",
    cols: 2,
    tone: "#1a7a4a",
    blocks: [
      { kind: "map", col: 0, span: 1, at: 0, lines: 8 },
      { kind: "photo", col: 1, span: 1, at: 0, lines: 8, colour: true },
    ],
      },
      {
    rung: 4,
    name: "One measure, a chart and a map in it",
    live: 0,
    anim: "bars",
    head: "tracked",
    cols: 1,
    tone: "#b3402a",
    blocks: [
      { kind: "chart", col: 0, span: 1, at: 4, lines: 6 },
      { kind: "map", col: 0, span: 1, at: 15, lines: 6 },
    ],
      },

      // ---- 5 · the drawing is the page
      {
    rung: 5,
    name: "One measure, one chart",
    live: 0,
    anim: "bars",
    head: "tracked",
    cols: 1,
    tone: "#b3402a",
    lead: true,
    blocks: [{ kind: "chart", col: 0, span: 1, at: 0, lines: 20 }],
      },
      {
    rung: 5,
    name: "A map, edge to edge",
    head: "tracked",
    cols: 2,
    tone: "#1a7a4a",
    lead: true,
    blocks: [{ kind: "map", col: 0, span: 2, at: 0, lines: 22 }],
      },
      {
    rung: 5,
    name: "Four charts on a grid",
    head: "centre",
    cols: 2,
    tone: "#1a2ffb",
    lead: true,
    blocks: [
      { kind: "chart", col: 0, span: 1, at: 0, lines: 9 },
      { kind: "chart", col: 1, span: 1, at: 0, lines: 9 },
      { kind: "chart", col: 0, span: 1, at: 11, lines: 9 },
      { kind: "chart", col: 1, span: 1, at: 11, lines: 9 },
    ],
      },
      {
    rung: 5,
    name: "Map over chart",
    head: "left",
    cols: 2,
    tone: "#b3402a",
    lead: true,
    blocks: [
      { kind: "map", col: 0, span: 2, at: 0, lines: 13 },
      { kind: "chart", col: 0, span: 2, at: 15, lines: 8 },
    ],
      },
      {
    rung: 5,
    name: "The chart, and a column beside it",
    live: 0,
    anim: "bars",
    head: "left",
    cols: 3,
    tone: "#1a2ffb",
    lead: true,
    blocks: [{ kind: "chart", col: 0, span: 2, at: 0, lines: 24 }],
      },
      {
    rung: 5,
    name: "Chart, map, chart",
    head: "centre",
    cols: 3,
    tone: "#1a7a4a",
    lead: true,
    blocks: [
      { kind: "chart", col: 0, span: 1, at: 0, lines: 10 },
      { kind: "map", col: 1, span: 1, at: 0, lines: 10 },
      { kind: "chart", col: 2, span: 1, at: 0, lines: 10 },
    ],
      },
      {
    rung: 6,
    name: "One chart, and nothing else",
    live: 0,
    anim: "bars",
    head: "centre",
    cols: 1,
    tone: "#1a2ffb",
    bare: true,
    blocks: [{ kind: "chart", col: 0, span: 1, at: 0, lines: 22 }],
      },
      {
    rung: 6,
    name: "A map, and nothing else",
    head: "band",
    cols: 1,
    tone: "#1a7a4a",
    bare: true,
    blocks: [{ kind: "map", col: 0, span: 1, at: 0, lines: 22 }],
      },
      {
    rung: 6,
    name: "Two charts, stacked",
    live: 0,
    anim: "bars",
    head: "tracked",
    cols: 1,
    tone: "#b3402a",
    bare: true,
    blocks: [
      { kind: "chart", col: 0, span: 1, at: 0, lines: 10 },
      { kind: "chart", col: 0, span: 1, at: 11, lines: 10 },
    ],
      },
      {
    rung: 6,
    name: "Six small multiples",
    head: "left",
    cols: 3,
    tone: "#1a2ffb",
    bare: true,
    blocks: [
      { kind: "chart", col: 0, span: 1, at: 0, lines: 12 },
      { kind: "chart", col: 1, span: 1, at: 0, lines: 12 },
      { kind: "chart", col: 2, span: 1, at: 0, lines: 12 },
      { kind: "chart", col: 0, span: 1, at: 13, lines: 12 },
      { kind: "chart", col: 1, span: 1, at: 13, lines: 12 },
      { kind: "chart", col: 2, span: 1, at: 13, lines: 12 },
    ],
      },
      {
    rung: 6,
    name: "The chart, and its key beside it",
    head: "boxed",
    cols: 3,
    tone: "#6b4ea8",
    bare: true,
    blocks: [
      { kind: "chart", col: 0, span: 2, at: 0, lines: 22 },
      { kind: "chart", col: 2, span: 1, at: 0, lines: 22 },
    ],
      },
      {
    rung: 6,
    name: "A map over a chart",
    head: "shoulder",
    cols: 1,
    tone: "#1a7a4a",
    bare: true,
    blocks: [
      { kind: "map", col: 0, span: 1, at: 0, lines: 14 },
      { kind: "chart", col: 0, span: 1, at: 15, lines: 7 },
    ],
      },
    ];

    /* ---- the story page. Not a rung: the argument.
     * A paper of nothing but words — which is what every page on the first
     * rung is — and then the desk makes room in it and puts a drawing there.
     * It is the whole proposition in one page, and the only page on the reel
     * that changes while you watch it. */
    /* A SEEDED SOURCE, so that a page's drawing is its own and does not
     * change identity between two frames of the same telling — but differs
     * from the page above it. Math.random() would reshuffle the chart on
     * every raster, which is not a graphic, it is static. */
    const seeded = (a) => () => {
      a = (a + 0x6d2b79f5) | 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };

    /* ------------------------------------------------------------- the ink
     * A second colour, drawn at random and CHECKED before it is used.
     *
     * Three fixed inks meant every page on the reel was one of three, and a
     * hand-picked set is also a set somebody has to keep picking. A hue is
     * taken at random instead — the whole circle, not the primaries — and
     * then it has to earn its place: measured against the paper it is
     * printed on and against the black it shares the page with.
     *
     * Both tests matter and they pull opposite ways. Too light and the
     * drawing disappears into the page; too dark and it stops reading as a
     * second colour at all, and the chart may as well have been one ink.
     */
    const srgb = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lum = (rgb) =>
      0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
    const ratio = (a, b) => {
      const x = lum(a) + 0.05,
        y = lum(b) + 0.05;
      return x > y ? x / y : y / x;
    };
    const hsl2rgb = (h, s, l) => {
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) =>
        Math.round(
          255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))),
        );
      return [f(0), f(8), f(4)];
    };
    const hexOf = (rgb) =>
      "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
    const PAPER_RGB = [255, 255, 255],
      BLACK_RGB = [23, 23, 23];
    /* THE FLOOR IS SET FOR PAPER THAT WILL BE DARKENED. These ratios are
     * computed against white, and the webs do not show white: the reel is
     * lifted, tone-mapped and remapped between the section's ground and
     * white before anyone sees it, so a ratio measured here arrives smaller
     * than it left. Four to one on paper is what survives that — the earlier
     * three-and-a-bit did not, which is why some inks went missing on the
     * webs while looking perfectly sound on the bench. */
    const INK_ON_PAPER = 4.0,
      INK_ON_BLACK = 1.9;
    /* AND SOME OF THEM ARE GREY. A second colour on newsprint is often not
     * a colour: a chart printed in one ink and a grey is the commonest thing
     * a paper does, and a reel where every page is coloured is a reel that
     * has never seen a newspaper. About a third print that way — dark enough
     * to hold against the paper, light enough to be told from the black
     * beside it, which is the same pair of tests the hues have to pass. */
    /* HOW MANY PAGES PRINT IN GREY. A third meant most pages were still
     * coloured and which ones you saw was luck — two loads running could
     * look like a colour supplement or like a broadsheet. It is a number
     * with a slider on it now, read at each recast so moving it takes hold
     * on the next page that opens: nought is every page coloured, one is
     * the whole reel in one ink and a grey. */
    /* EVERY PAGE, BY DEFAULT. Greyscale means black and white — not a
     * palette with some grey in it — so the share starts at one and the
     * whole reel prints in one ink. The hues are still there and still
     * measured; the slider is what lets them back in. */
    const GREY_DEFAULT = 1;
    const GREY_SHARE = () => {
      /* P is declared further down, and the papers are built at module
       * level — so this runs while P is in its dead zone. `typeof P` does
       * NOT make that safe: typeof only swallows the error for an
       * UNDECLARED name, and for a const before its declaration it throws
       * like any other read. That threw the whole module before Stage saw
       * it, silently, for the second time today. */
      try {
        return P.greyShare === undefined ? GREY_DEFAULT : P.greyShare;
      } catch (e) {
        return GREY_DEFAULT;
      }
    };
    function greyFor(rnd) {
      /* The valid band collected, and one taken from it at RANDOM. Keeping
       * the most balanced lightness is the argmax again: every grey came out
       * the same grey, which is one ink and not a range of them. */
      /* NEUTRAL, and dark. A grey with a hue in it is a colour that has
       * been talked down. This one is the ink a line or a route is drawn
       * in and it has to hold on its own — the SPREAD from white to black
       * is not here, it belongs to the drawings, which is where a scale of
       * values actually means something. */
      // A route at thirteen per cent lightness is the same hole in another
      // shape, so the stroke ink comes up with the scale.
      const ok = [];
      for (let l = 0.56; l >= 0.3; l -= 0.01) {
        const g = Math.round(255 * l);
        ok.push(hexOf([g, g, g]));
      }
      return ok[Math.floor(rnd() * ok.length)];
    }

    function inkFor(rnd) {
      if (rnd() < GREY_SHARE()) return greyFor(rnd);
      /* A HUE FIRST, then the lightness that suits it — and the first hue
       * that works, not the best of many tries. Scoring sixty hues and
       * keeping the winner is an argmax and not a draw: the same few win
       * every time, and a palette meant to be the whole circle came out red
       * and violet with no green, no teal and no ochre in it.
       *
       * The lightness is searched because hues do not carry luminance alike.
       * A blue at half lightness is already dark enough for the paper; a
       * yellow at the same number is nowhere near, and has to come down to
       * an ochre before it reads — which is a real printing ink, and exactly
       * the kind this was throwing away. */
      for (let tries = 0; tries < 40; tries++) {
        const h = rnd() * 360,
          sat = 0.38 + rnd() * 0.5;
        let best = null;
        for (let l = 0.58; l >= 0.16; l -= 0.015) {
          const rgb = hsl2rgb(h, sat, l);
          const onPaper = ratio(rgb, PAPER_RGB),
            onBlack = ratio(rgb, BLACK_RGB);
          if (onPaper < INK_ON_PAPER || onBlack < INK_ON_BLACK) continue;
          // the most BALANCED lightness that works: far enough from the
          // paper to be seen, far enough from the black to be a colour
          const bal = Math.min(onPaper / 4.5, 1) * Math.min(onBlack / 2.4, 1);
          if (!best || bal > best[0]) best = [bal, hexOf(rgb)];
        }
        if (best) return best[1];
      }
      return "#b3402a";
    }

    /* A DIFFERENT PAPER EVERY LOAD. The heads, the measures and the inks
     * were fixed lists, so the reel was the same nine papers in the same
     * order every time the page opened — and a reel that is always the same
     * is a picture of a press, not a press. The salt is drawn once at load
     * and everything downstream derives from it, so a session is consistent
     * with itself and no two sessions agree. */
    const LOAD_SALT = (Math.random() * 1e9) | 0;
    /* Where the reel is when the page opens. The clock starts at zero every
     * load, so the three webs always came up on the same three pages however
     * different those pages were. This moves the whole set and leaves the
     * spacing between the webs exactly as it was. */
    const WEB_PHASE = Math.random();
    /* WHEN EACH WEB COMES IN. The boot screen hands over to the paper, not
     * to the page's furniture, so the three arrive under its fade rather
     * than being there already when it lifts — a beat apart, because three
     * sheets appearing together is a slide changing and three arriving one
     * after another is a press starting. */
    // the middle first, then the left, then the right: the sheet that covers
    // the boot's mark is the one that arrives on it, and the frame fills
    // outward from there rather than closing in on it
    const WEB_IN = [0.26, 0, 0.52];
    /* AND HOW THEY LEAVE: on up and off the top. The paper does not come in
     * from below and then back out below — it keeps going, and it is taken
     * off bottom edge first, top edge last, which is the same direction it
     * has been travelling since it arrived. Same stagger, same quintic, a
     * shade quicker because the reader has already asked to go and is being
     * held while it plays. */
    const OUT_RAMP = 1.2;
    const OUT_SPAN = OUT_RAMP + Math.max.apply(null, WEB_IN);
    let outSec = 0;
    let bootAt = null;
    /* The boot screen is clipped by where the paper actually is, so the web
     * loop hands it the middle sheet's leading edge. Looked up until the
     * screen has gone and then never again. */
    let bootMark = true;
    const HEAD_SET = ["centre", "band", "tracked", "left", "boxed", "shoulder"];
    /* THE TEMPLATES, DEALT RATHER THAN DRAWN — the same argument as the
     * drawings, and the same fix.
     *
     * A head picked at random per page and a measure picked at random per
     * page put two identical skeletons side by side often enough to be the
     * first thing the eye finds: three columns under a banner, twice, is one
     * paper photocopied. Six heads by three measures is eighteen templates,
     * and eighteen is exactly how many pages the sheet carries — so they are
     * shuffled once and dealt out, and no two pages on the whole reel share
     * a skeleton, let alone two that are up at the same moment. */
    const TEMPLATE_DECK = (() => {
      const d = [];
      for (const h of HEAD_SET) for (let c = 1; c <= 3; c++) d.push({ head: h, cols: c });
      const r = seeded(LOAD_SALT + 7717);
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = d[i];
        d[i] = d[j];
        d[j] = t;
      }
      return d;
    })();
    /* A COLUMN OF THE REEL. Each web reads one of these and only that one,
     * so the three can never hold the same page — and therefore never the
     * same drawing — however far their speeds pull their offsets apart. */
    const storyPapers = (n, col) =>
      Array.from({ length: n }, (_, i) => {
        const r = seeded(LOAD_SALT + col * 104729 + i * 5197);
        const T = TEMPLATE_DECK[(col * n + i) % TEMPLATE_DECK.length];
        return {
          rung: 1,
          story: true,
          name: "The article, and what the desk makes of it",
          head: T.head,
          cols: T.cols,
          tone: inkFor(r),
        };
      });


    /* THE HOLES. Six to a rung was reached by writing pages from nothing —
     * decade labels and paragraphs I made up — and they are out again. What
     * the reel wants at each of these years is named here instead, and drawn
     * as an empty page, so the work still to be done is visible in the reel
     * and countable in the catalogue rather than hidden behind filler. */
    const EMPTIES = [
      { year: 1931, rung: 2, need: "One more page of text with a black-and-white plate" },
      { year: 1938, rung: 3, need: "The first colour photograph on a news page" },
      { year: 1948, rung: 3, need: "Colour on a magazine cover" },
      { year: 1955, rung: 3, need: "A colour photograph across the whole measure" },
      { year: 1962, rung: 3, need: "Colour off the wire, the same day" },
      { year: 1969, rung: 3, need: "Colour on the front page of a daily" },
      { year: 1975, rung: 3, need: "Colour through the whole paper" },
      { year: 1972, rung: 4, need: "A chart the size of a paragraph, set in the measure" },
      { year: 1979, rung: 4, need: "The locator map, inset in a column" },
      { year: 1986, rung: 4, need: "A chart sent down the wire" },
      { year: 1991, rung: 4, need: "A house style: one idea a chart" },
      { year: 1998, rung: 4, need: "Small multiples across a grid" },
      { year: 2001, rung: 4, need: "The same piece, published on paper and on a screen" },
      { year: 2004, rung: 5, need: "The graphic takes the top of the page" },
      { year: 2014, rung: 5, need: "Built rather than drawn, at every size" },
      { year: 2016, rung: 5, need: "A piece that answers to the reader" },
      { year: 2018, rung: 5, need: "The story told by scrolling" },
      { year: 2022, rung: 5, need: "Motion, out of the same data" },
      { year: 2026, rung: 5, need: "Made at the desk, by the assistant" },
    ];

    /* THE PIECES THAT FOUNDED THE FORM.
     *
     * Five plates, in the years they were printed, set into the reel among
     * the papers of their own decade. They are not decoration and they are
     * not invented: each is the real sheet, public domain, and each is
     * captioned with what it is and who drew it. They are also the argument
     * the whole reel makes — that what a desk does now has a lineage, and
     * that the lineage is a hundred and forty years long. */
    const LANDMARKS = [
      {
        year: 1786,
        rung: 0,
        body: "Playfair engraved the trade of a century as a shape. Two lines run across eighty-two years, imports and exports, and the space between them is filled and labelled — the balance, in favour of England or against it, read off as an area rather than counted out of a table. He had to explain in the text that the bottom of the plate was years and the side was millions of pounds, because no reader had seen a quantity drawn against time before. The Commercial and Political Atlas carried forty-four such plates and one bar chart, made because Scotland's trade for a single year had no time to run along.", // outside the ramp
        was: 3,
        src: "The Commercial and Political Atlas",
        by: "William Playfair",
        what: "Imports and exports to and from England, 1700 to 1782 — the first time a quantity over time was drawn as a line.",
        img: "https://upload.wikimedia.org/wikipedia/commons/4/4f/1786_Playfair_-_1_Chart_of_all_the_import_and_exports_to_and_from_England_from_the_year_1700_to_1782.jpg",
      },
      {
        year: 1854,
        rung: 0,
        body: "In the ten days after the last day of August 1854, more than five hundred people died within a few streets of Golden Square. Snow marked every death as a bar against the house it happened in, and the bars gathered around one thing: the public pump in Broad Street. The map is an argument rather than an illustration — it shows the deaths thinning with distance from that pump, and the households that drew their water elsewhere standing clear in the middle of them. He put it before the parish board, the handle was taken off, and the map went into the second edition of his essay the following year.", // outside the ramp
        was: 2,
        src: "On the Mode of Communication of Cholera",
        by: "Dr John Snow",
        what: "Deaths from cholera around Broad Street, Soho — a map that found a pump.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Snow-cholera-map-1.jpg/1280px-Snow-cholera-map-1.jpg",
      },
      {
        year: 1858,
        rung: 0,
        body: "Each wedge is a month of the war in the Crimea, and its area is the men who died in it. Blue is preventable disease, red is wounds, black is everything else — and the blue is most of the figure. Nightingale drew it for a royal commission and for readers who would not sit through a table, and she was right about them: the diagram was reprinted, argued over and acted on, and the sanitary commissions that followed it were the reason the second winter looks like the small figure beside the first.", // outside the ramp
        was: 3,
        src: "Notes on Matters Affecting the Health of the British Army",
        by: "Florence Nightingale",
        what: "Diagram of the causes of mortality in the army in the East — the blue is what killed more than the fighting.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Nightingale-mortality.jpg/1280px-Nightingale-mortality.jpg",
      },
      {
        year: 1869,
        rung: 0,
        body: "Six things at once, on one sheet: the size of the army as the width of the band, where it went, which way it was going, the places it passed, the dates, and the temperature on the retreat drawn underneath. Four hundred and twenty-two thousand men go into Russia as a broad tan river and ten thousand come back as a black thread. Minard was seventy-eight and had been drawing flows of goods and passengers for thirty years; this is the one that is still taught, because nothing in it is decoration.", // outside the ramp
        was: 3,
        src: "Tableaux graphiques et cartes figuratives",
        by: "Charles Joseph Minard",
        what: "The Russian campaign of 1812: six variables in one figure, and the width of the band is the army.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Minards_chart_Napoleons_Russian_campaign_of_1812_made_in_1869.jpg/1280px-Minards_chart_Napoleons_Russian_campaign_of_1812_made_in_1869.jpg",
      },
      {
        year: 1900,
        rung: 0,
        body: "Du Bois took a set of hand-drawn charts to the Exposition Universelle in Paris and hung them in the Palace of Social Economy. He and his students at Atlanta University had made them in ink and gouache — bars, spirals, fans, a map of Georgia by county — out of census returns and their own surveys, to answer a question the fair itself was asking badly. The plates are a century ahead of their look: the colour is doing work, the forms are chosen for what they have to say, and every one of them carries the number it was drawn from.", // outside the ramp
        was: 3,
        src: "The Exhibit of American Negroes, Paris Exposition",
        by: "W. E. B. Du Bois",
        what: "Occupations of Negroes and whites in Georgia — drawn by hand, in gouache, to be argued with.",
        img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/The_Georgia_Negro_-_Occupations_of_Negroes_and_whites_in_Georgia.tif/lossy-page1-1280px-The_Georgia_Negro_-_Occupations_of_Negroes_and_whites_in_Georgia.tif.jpg",
      },
    ];

    /* The middle of the ramp: the decades when the graphic climbed to the top
     * of the page and the words moved under it. Labelled by what the form did,
     * not by an invented story — the same honesty the modern pages keep. */
    /* 3 and 4 of the ramp. Labelled by what the FORM did in the decade, never
     * by an invented story — the same rule the other made pages keep. */




    /* The papers in the order they were printed, which is the order the reel
     * runs in. Their own datelines decide it — nothing here is a choice. */
    const CHRONO = () =>
      ARTICLES.slice().sort((a, b) => {
    const y = (A) => parseInt((A.date.match(/\d{4}/) || ["1900"])[0], 10);
    return y(a) - y(b);
      });

    let panelSheet = null; // the atlas canvas, kept so the reel can read it

    /* THE MEASURE OF ONE WEB, in texels — and it is CAPPED by the card.
     *
     * A texture has a maximum side, and on this machine it is 16384. Thirty
     * pages of 560 rows come to 16800, so the upload failed and failed
     * SILENTLY: no error, no warning, just three webs with nothing to read and
     * a black frame where the hero should be. The column is therefore narrowed
     * until the whole run fits, and it is measured against the card rather
     * than guessed — add a page and the reel shrinks to make room by itself
     * instead of going dark. */
    let GALLEY_COL = 400;
    const GALLEY_GAP = 0;
    /* THREE COLUMNS, ONE PER WEB — and this is a correctness fix, not a
     * decoration.
     *
     * One shared column was defensible while the three webs sat a fixed
     * third of the reel apart: three offsets into one chronology showed
     * three different pages, and that was the guarantee. It stopped being
     * one the moment the webs were given DIFFERENT SPEEDS. The offsets are
     * no longer fixed — they drift by the difference in rate, half a page a
     * minute — so the windows slide into each other, and when they overlap
     * the same page is on two webs at once. That is both faults the reel is
     * supposed to make impossible: the same drawing twice on the screen,
     * and a page arriving in one web already half drawn because the other
     * web opened it a while ago.
     *
     * A column each removes the possibility rather than managing it. No
     * page is ever in two windows, whatever the speeds do, because no page
     * is in two columns. */
    const GALLEY_COLS = 3;
    /* HOW MANY DEVICE TEXELS TO ONE UNIT OF THE PAGE.
     *
     * The pages are set in a coordinate system where the measure is four
     * hundred units, and they were STORED at four hundred texels — then
     * magnified onto a sheet a third of the frame wide, which on a retina
     * screen is nearer a thousand device pixels. Nine-unit body type
     * arriving as twenty-two pixels drawn from nine is exactly what the
     * newsprint looked like, and no filter fixes it: the resolution was
     * never there.
     *
     * The fix is a transform on the galley's context and nothing else. Every
     * press still draws in the same units at the same sizes; the canvas
     * underneath is twice as big in each direction, so the type is RASTERISED
     * at twice the resolution rather than resampled up to it. */
    let GALLEY_SS = 2;
    /* The reel the tuned speeds were set against. A web's speed on screen is
     * its rate over the fraction of the reel in shot, and that fraction is
     * one over the number of pages — so shortening the reel would quietly
     * slow the paper down. The rate is normalised by this instead, and the
     * numbers in the panel keep meaning what they meant. */
    const REEL_REF = 9;
    /* A PAGE IS A PAGE. Its depth is the sheet its press printed on, as a
     * ratio of the measure — a broadsheet is a tall thin thing, a monthly is
     * nearly square — and never how much of the article happened to be set.
     * Measuring the text instead gave eleven pages of eleven different heights
     * with no reason behind any of them, and a short piece produced a stub. */
    /* ONE FORMAT, for every page on the reel.
     *
     * Each press used to print on its own sheet — a broadsheet tall and
     * narrow, a monthly nearly square — which is true of the presses and wrong
     * for this. Nothing lined up with anything: the webs never showed two
     * pages at the same height, a cut landed somewhere different on every one,
     * and each new template had its height tuned by hand against the last. The
     * realism cost more than it bought. */
    const PAGE_RATIO = 1.4;
    const pageH = () => Math.round(GALLEY_COL * PAGE_RATIO);

    let GALLEY_W = GALLEY_COL;
    // Settled by the measuring pass, and read by the frame to size the window
    // it slides down the web. Never a literal.
    let GALLEY_H = 4400;
    let REEL = [];
    /* Where every page of the reel begins, as a fraction of it. The montage
     * cuts on these and nothing else — a cut that lands mid-page is a jump,
     * not an edit. */
    const CUTS = [];
    const PAGES = [];

    /* The photographs. Every one of these is a real plate belonging to the
     * story it sits in, public domain, and served with an open CORS header —
     * which the hero needs, because a canvas that has drawn a cross-origin
     * image without one cannot be uploaded as a texture at all.
     *
     * They are fetched, not carried: the page holds no image files. If one
     * fails, or the header ever goes away, the press keeps the drawn plate it
     * had before and nothing else changes.
     */
    /* WHAT ACTUALLY GOES IN THE HOLES. Not drawings of charts: real ones,
     * captured off the pages that published them — Information is Beautiful
     * for the built graphics, Our World in Data for the choropleths — and
     * real photographs. Nothing in this list was made here, which is the
     * point: the reel is showing what the form looks like, so a chart on it
     * has to be a chart somebody actually published.
     *
     * They arrive as data URIs from press-assets.js, and the reason is not
     * speed. The galley is a canvas that becomes a texture, and the bench
     * reads that same canvas back with toDataURL; both throw on a canvas an
     * image has TAINTED. A file loaded from disk taints one — under file://
     * a document is its own opaque origin — so a bench page opened straight
     * off the disk would lose the entire reel the moment a photograph was
     * drawn into it. A data URI has no origin to be foreign to.
     *
     * If the table is not on the page the holes keep their drawn stand-ins
     * and nothing else changes. */
    const PRESS_ASSETS = (window.PRESS_DATA || { photo: [], chart: [], map: [] });


    /* ------------------------------------------------- the moving graphic
     * A block on the page whose contents are HTML, rendered LIVE.
     *
     * The paper is a canvas that becomes a texture, so nothing on it can be
     * a live document — but real markup can be rasterised into it, through
     * an <foreignObject> in an SVG carried as a data URI. Measured: real
     * layout, no tainting, 0.46ms for the whole round trip of a block this
     * size, and an <svg> nested inside the HTML renders too, which is what
     * makes a line or an arc possible at all.
     *
     * What that route cannot do is move by ITSELF. An SVG loaded as an image
     * runs in secure static mode, and the probe says so plainly: a CSS
     * animation sat at 10px at t=0 and at t=900ms, and a webfont was ignored
     * for the system fallback. So the motion is composed outside the markup,
     * and composed FRESH — not baked into phases and played back, because
     * these numbers are decided as they are drawn.
     */
    /* Asked for on every frame. What paces the arrival is how fast the
     * stages come back, not a timer — and there are only ever a couple in
     * flight, which is the thing that actually needed bounding. */
    const LIVE_HZ = 60;
    /* AND HOW OFTEN A PAGE IS SET AGAIN. It was every frame the hole had
     * moved at all, which is sixty times a second and 88 megabytes a second
     * of texture going back up the bus for text that slides an inch in a
     * second and a half. Thirty is above what the eye resolves in a slide
     * that slow, and it halves the traffic. */
    const PAINT_HZ = 60;
    let LIVE_HOLES = [];
    let galleyCv = null;
    /* Where each of the three webs currently is in the lap, and how much of
     * it is in shot. Written by the draw, read by the frame loop — one frame
     * stale, which at a hundredth of a lap a second is nothing. */
    const WEB_WIN = [0, 0, 0, 0.2];
    /* How far each web is through its arrival, 0 to 1. Written by the draw,
     * read by the telling: a page whose web is still climbing is printed
     * paper and nothing else. Type sliding to make room, and a chart drawing
     * itself, while the sheet is still coming up the frame is two motions on
     * top of each other and neither reads. */
    const WEB_INE = [0, 0, 0];
    /* IN SHOT MEANS READABLE, not merely mapped onto a web.
     *
     * The window a web reads is the whole of its geometry, and its geometry
     * is half again as tall as the frame — then it fades out towards both
     * ends, so the top and bottom of that window are off screen or on their
     * way there. Testing against all of it meant a page counted as arriving
     * long before anyone could see it: it spent its whole telling out of
     * sight and slid into the frame with the graphic already finished,
     * which is the one thing this was supposed to prevent.
     *
     * The band is the middle of the window — where the paper is at full
     * strength and inside the frame. A page starts its telling when it
     * reaches that, and is only let go once it is well clear of it. */
    const BAND = 0.26; // trimmed off each end of a web's window
    /* ASKED OF ONE WEB, not of all three. A page belongs to the column its
     * web reads, so the only window that can ever show it is that web's —
     * and it is that web's REAL position, written by the draw a frame ago,
     * which is what makes the three different speeds account for
     * themselves rather than be assumed away. */
    const inShot = (y0, y1, pad, col) => {
      const m = pad === undefined ? 0.02 : pad,
        a = y0 / GALLEY_H,
        b = y1 / GALLEY_H,
        dv = WEB_WIN[3],
        lo = dv * BAND,
        hi = dv * (1 - BAND);
      const k0 = col === undefined ? 0 : col,
        k1 = col === undefined ? 2 : col;
      for (let k = k0; k <= k1; k++) {
        // the window wraps, so it is tested against three copies of the reel
        const v = WEB_WIN[k];
        for (let o = -1; o <= 1; o++)
          if (a < v + hi + m + o && b > v + lo - m + o) return true;
      }
      return false;
    };

    /* THE NUMBERS, CAST ONCE AND HELD.
     *
     * They used to walk — a value drifting towards a target for ever — and
     * that was wrong once the drawing had arrived. A chart that keeps moving
     * after it is finished cannot be read: the eye is still being asked to
     * track it at the moment it should be free to look. So a telling gets
     * ONE set of numbers, drawn when the page is recast, and they do not
     * move again. What moves is the arrival, and the arrival ends.
     *
     * It costs nothing to hold, either. Nothing changes during the hold, so
     * nothing is rasterised and nothing is written back to the reel — which
     * is most of every cycle. */
    const clamp01 = (u) => Math.max(0, Math.min(1, u));
    const LIVE_N = 16;
    const liveNow = [],
      liveTo = [];
    for (let i = 0; i < LIVE_N; i++) {
      liveNow.push(0.2 + Math.random() * 0.7);
      liveTo.push(0.15 + Math.random() * 0.8);
    }
    function liveStep(dt) {
      for (let i = 0; i < LIVE_N; i++) {
        const d = liveTo[i] - liveNow[i];
        liveNow[i] += d * Math.min(1, dt * 2.4);
        if (Math.abs(d) < 0.015) liveTo[i] = 0.12 + Math.random() * 0.85;
      }
    }
    // a fresh set, for one telling
    const castValues = (rnd) => {
      const out = [];
      for (let i = 0; i < LIVE_N; i++) out.push(0.14 + rnd() * 0.82);
      return out;
    };

    /* ---------------------------------------------------- the drawings
     * Six charts and six maps. Each arrives by its own gesture — a bar
     * rises, a line is traced, a map fills in — holds perfectly still, and
     * then LEAVES BY THE SAME GESTURE CONTINUING. Not reversed: reversing
     * un-draws a graphic, which reads as a mistake being undone, and not
     * faded either, which reads as nothing at all. The sweep that brought
     * the first bar in comes round again and takes it away, in the same
     * direction, so arrival and departure are one movement passing through.
     *
     * That is what `p` and `q` are. p is how far the sweep has arrived, q
     * how far the same sweep has left; an element is present by the amount
     * one leads the other. Between them they need no alpha anywhere.
     *
     * The furniture is set in a sans, at a size and a grey that put it
     * beneath the drawing rather than beside it: a chart's title is a label,
     * not a headline. It sits on a page of Georgia on purpose — the graphic
     * should read as a made thing set INTO the article, which is what it is.
     */
    const CHARTS = ["bars", "line", "area", "stack", "scatter", "donut"];
    const MAPS = ["units", "choro", "places", "flows", "route", "rings"];
    const LIVE_KINDS = CHARTS.concat(MAPS);

    /* SINGLE quotes around the family with a space in it. This string goes
     * into an attribute of an SVG that is parsed as XML, and a double quote
     * inside a double-quoted attribute ends it — the whole document fails to
     * parse and the Image simply never loads, silently, with every drawing
     * coming out blank. */
    const SANS =
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
    const DINK = "#171717",
      GRID = "#e8e6e2",
      AXIS = "#a6a29b",
      MUTE = "#9b978f",
      PALE = "#eceae5",
      /* Land has to be darker than you think. At a quarter of a page the map
       * is competing with a column of nine-point type beside it, and a fill
       * three per cent off white reads as blank paper — the shape of the
       * world was there and could not be seen. */
      LAND = "#e0dcd4";
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const fmt = (n) =>
      n >= 1000 ? Math.round(n / 100) / 10 + "k" : n >= 10 ? Math.round(n) : n.toFixed(1);

    const svgWrap = (w, h, body) =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
      '" viewBox="0 0 ' + w + " " + h + '">' + body + "</svg>";

    /* One element's share of the sweep. p brings it, q takes it, and both
     * run the same way down the set, so nothing ever moves backwards. */
    const sweep = (i, n, p, q, spread) => {
      const s = spread === undefined ? 1.15 : spread;
      const lead = 1 + s;
      const a = clamp01(p * lead - (i / Math.max(1, n)) * s);
      const b = clamp01(q * lead - (i / Math.max(1, n)) * s);
      return Math.max(0, (1 - Math.pow(1 - a, 3)) - (1 - Math.pow(1 - b, 3)));
    };
    // and where a continuous path currently begins and ends
    const span = (n, p, q) => [q * (n - 1), p * (n - 1)];

    /* THE FURNITURE, in one place, and it gives way as the block gets
     * smaller. A chart the size of a paragraph has no room for a title and
     * no need of one; a block under seventy pixels has room for the drawing
     * and nothing else. Everything is inset, because a rule that touches the
     * edge of its block reads as a crop rather than as a chart. */
    const chrome = (w, h, title, note, draw) => {
      const pad = h < 74 ? 4 : h < 118 ? 7 : 11;
      const iw = Math.max(20, w - pad * 2);
      const titled = h >= 90 && w >= 96;
      const noted = h >= 124 && w >= 120;
      /* The title needs AIR UNDER IT. Set flush, the first gridline starts a
       * pixel below the descenders and the label reads as part of the chart
       * rather than as its name. The gap is a third of the title's own line,
       * which is what the eye takes as a break. */
      const tH = 14,
        TGAP = 9,
        // margin 9, rule 1, space 5, and a line of 9 — the block the source
        // occupies, reserved before the plot is given what is left
        nH = 20;
      const ph = Math.max(12, h - pad * 2 - (titled ? tH + TGAP : 0) - (noted ? nH : 0));
      return (
        '<div style="box-sizing:border-box;width:' + w + "px;height:" + h +
        "px;padding:" + pad + 'px;font-family:' + SANS + '">' +
        (titled
          ? '<div style="font:600 10.5px/' + tH + "px " + SANS + ";color:" + DINK +
            ";height:" + tH + "px;margin-bottom:" + TGAP +
            'px;letter-spacing:-.004em;overflow:hidden;' +
            'white-space:nowrap;text-overflow:ellipsis">' + esc(title) + "</div>"
          : "") +
        draw(iw, ph) +
        (noted
          ? '<div style="height:7px;margin-top:9px;padding-top:4px;' +
            "border-top:1px solid " + GRID + ";font:400 5.5px/7px " + SANS +
            ";color:" + MUTE + ";letter-spacing:.005em;overflow:hidden;" +
            'white-space:nowrap;text-overflow:ellipsis">' + esc(note) + "</div>"
          : "") +
        "</div>"
      );
    };

    /* A value axis: hairlines with their figures sitting ON them, ranged
     * right in a gutter. No axis line and no ticks — the rules are what a
     * height is read against, and a box drawn round a chart is furniture
     * from a spreadsheet. */
    const GUT = 26;
    const yAxis = (w, h, top, gut) => {
      let out = "";
      for (let i = 0; i <= 2; i++) {
        const y = h - (i / 2) * (h - 9);
        // the figure sits ON its rule, and the one at the foot is lifted so
        // it stays inside the block instead of hanging off the bottom of it
        const ty = i === 0 ? y - 3 : y + 2.8;
        out +=
          '<path d="M' + gut + " " + y.toFixed(1) + " H" + w + '" stroke="' +
          GRID + '" stroke-width="1" fill="none"/>';
        if (gut > 0)
          out +=
            '<text x="' + (gut - 6) + '" y="' + ty.toFixed(1) +
            '" text-anchor="end" font-family="' + SANS +
            '" font-size="8" fill="' + AXIS + '">' + fmt((i / 2) * top) + "</text>";
      }
      return out;
    };

    const hexRGB = (hx) => [
      parseInt(hx.slice(1, 3), 16),
      parseInt(hx.slice(3, 5), 16),
      parseInt(hx.slice(5, 7), 16),
    ];

    /* A SCALE OF VALUES, WHITE TO BLACK.
     *
     * A black-and-white chart is not one grey used everywhere: it is the
     * whole spectrum, from paper showing through to solid ink, and a reader
     * tells one class from another by how dark it is. A single mid grey
     * standing in for a colour is a chart with its scale thrown away.
     *
     * On a coloured page the same call runs from the paper to that page's
     * own ink, which is the same idea said in one hue. Every drawing with
     * more than one class in it asks this rather than choosing for itself,
     * so the two read as one desk working in two inks.
     */
    const isNeutral = (hx) =>
      hx.slice(1, 3) === hx.slice(3, 5) && hx.slice(3, 5) === hx.slice(5, 7);
    const mixRGB = (a, b, k) =>
      hexOf([
        Math.round(a[0] + (b[0] - a[0]) * k),
        Math.round(a[1] + (b[1] - a[1]) * k),
        Math.round(a[2] + (b[2] - a[2]) * k),
      ]);
    const NEAR_WHITE = [246, 244, 240],
      NEAR_BLACK = [18, 18, 18];
    /* IT STOPS SHORT OF BLACK, AND ITS STEPS ARE EQUAL.
     *
     * The darkest class used to be solid ink, and on a web that is a hole:
     * the sheet arrives at about a twelfth of white, so anything past the
     * middle of the scale lands on the ground itself and a map, a grid or a
     * field of dots comes out as one black shape. It runs to a mid-dark
     * grey instead — still the heaviest thing on the page, still four to
     * one against paper on the bench, and far enough off the ground that
     * the class below it has room.
     *
     * And it is linear. A bent ladder put its classes forty-six levels
     * apart at one end and nineteen at the other, and nineteen levels of
     * grey is a difference the eye will not go looking for. Five classes
     * now land thirty-four apart, every step the same as the one before —
     * the only arrangement where no two neighbours are harder to tell apart
     * than any other two.
     */
    const VALUE_LIGHTEST = 0.03,
      VALUE_DARKEST = 0.7;
    const value = (t, tone) => {
      const k = clamp01(t);
      const m = VALUE_LIGHTEST + k * (VALUE_DARKEST - VALUE_LIGHTEST);
      if (isNeutral(tone)) return mixRGB(NEAR_WHITE, NEAR_BLACK, m);
      const rgb = [
        parseInt(tone.slice(1, 3), 16),
        parseInt(tone.slice(3, 5), 16),
        parseInt(tone.slice(5, 7), 16),
      ];
      return mixRGB(NEAR_WHITE, rgb, 0.14 + k * 0.72);
    };

    /* THE FEW NUMBERS THE REVEAL ALSO NEEDS.
     *
     * A clip can reproduce a staggered gesture — bars coming up one after
     * another rather than together — but only if it knows where the bars
     * are. Rather than let the reveal guess, the two counts that decide
     * that live here and both the drawing and the clip read them. Guessing
     * would work until somebody changed a chart. */
    const barCount = (pw) => (pw < 130 ? 9 : 13);
    const barGut = (pw) => (pw < 130 ? 0 : GUT);
    const stackRows = (ph) => (ph < 90 ? 4 : 6);
    const stackGap = (ph) => Math.max(3, ph * 0.06);

    const LIVE_ART = {};

    // ---- charts -------------------------------------------------------
    LIVE_ART.bars = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "Output by quarter", "Office for National Statistics, 2026",
        (pw, ph) => {
          const n = barCount(pw),
            gut = barGut(pw),
            top = 40 + Math.round(rnd() * 60);
          const bw = (pw - gut) / n;
          let out = yAxis(pw, ph, top, gut);
          for (let i = 0; i < n; i++) {
            const k = sweep(i, n, p, q);
            if (k <= 0) continue;
            const tall = v[i % v.length] * (ph - 6) * k;
            out +=
              '<rect x="' + (gut + i * bw + bw * 0.16).toFixed(1) + '" y="' +
              (ph - tall).toFixed(1) + '" width="' + (bw * 0.68).toFixed(1) +
              '" height="' + Math.max(0.6, tall).toFixed(1) + '" rx="1" fill="' +
              // read off its own height: the tallest bar is the darkest,
              // which is the whole of what a value scale is for
              value(0.2 + v[i % v.length] * 0.8, tone) + '"/>';
          }
          return svgWrap(pw, ph, out);
        });

    LIVE_ART.line = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "The series, by year", "Annual returns, 1994–2026",
        (pw, ph) => {
          const n = 13,
            gut = pw < 130 ? 0 : GUT,
            top = 60 + Math.round(rnd() * 40);
          /* THE HEAD IS PART OF THE LINE, and it is the widest part of it.
           * The last point sat exactly on the right edge of the plot, so the
           * ring that marks it was cut in half by the frame at the moment
           * the drawing finished arriving — the one frame anybody looks at.
           * The run is shortened by the head's own radius, and the fall is
           * held inside it too, so the mark always lands whole. */
          const HEAD = 4.4;
          const X = (i) => gut + (i / (n - 1)) * (pw - gut - HEAD);
          const Y = (i) =>
            Math.max(
              HEAD,
              Math.min(ph - HEAD, ph - 3 - v[(i * 3) % v.length] * (ph - 12)),
            );
          const [from, to] = span(n, p, q);
          if (to <= from) return svgWrap(pw, ph, yAxis(pw, ph, top, gut));
          const at = (f) => {
            const i = Math.max(0, Math.min(n - 2, Math.floor(f))),
              k = f - i;
            return [X(i) + (X(i + 1) - X(i)) * k, Y(i) + (Y(i + 1) - Y(i)) * k];
          };
          let d = "";
          const s0 = at(from);
          d += "M" + s0[0].toFixed(1) + " " + s0[1].toFixed(1);
          for (let i = Math.ceil(from); i <= Math.floor(to); i++)
            d += " L" + X(i).toFixed(1) + " " + Y(i).toFixed(1);
          const s1 = at(to);
          d += " L" + s1[0].toFixed(1) + " " + s1[1].toFixed(1);
          return svgWrap(pw, ph,
            yAxis(pw, ph, top, gut) +
            '<path d="' + d + '" fill="none" stroke="' + tone +
            '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<circle cx="' + s1[0].toFixed(1) + '" cy="' + s1[1].toFixed(1) +
            '" r="2.8" fill="#fff" stroke="' + tone + '" stroke-width="2"/>');
        });

    LIVE_ART.area = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "Share of the whole", "Per cent of total, quarterly",
        (pw, ph) => {
          const n = 15,
            gut = pw < 130 ? 0 : GUT;
          const X = (i) => gut + (i / (n - 1)) * (pw - gut);
          const Y = (i) => ph - 3 - v[(i * 5) % v.length] * (ph - 12);
          const [from, to] = span(n, p, q);
          if (to <= from) return svgWrap(pw, ph, yAxis(pw, ph, 100, gut));
          const at = (f) => {
            const i = Math.max(0, Math.min(n - 2, Math.floor(f))),
              k = f - i;
            return [X(i) + (X(i + 1) - X(i)) * k, Y(i) + (Y(i + 1) - Y(i)) * k];
          };
          const a = at(from),
            b = at(to);
          let top = "M" + a[0].toFixed(1) + " " + a[1].toFixed(1);
          for (let i = Math.ceil(from); i <= Math.floor(to); i++)
            top += " L" + X(i).toFixed(1) + " " + Y(i).toFixed(1);
          top += " L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
          const fill = top + " L" + b[0].toFixed(1) + " " + ph + " L" +
            a[0].toFixed(1) + " " + ph + " Z";
          return svgWrap(pw, ph,
            yAxis(pw, ph, 100, gut) +
            '<path d="' + fill + '" fill="' + tone + '" opacity=".3"/>' +
            '<path d="' + top + '" fill="none" stroke="' + tone +
            '" stroke-width="2" stroke-linejoin="round"/>');
        });

    LIVE_ART.stack = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "By category", "Three parts of each, per cent",
        (pw, ph) => {
          const rows = stackRows(ph),
            lab = pw < 130 ? 0 : 16,
            gap = stackGap(ph);
          const rh = Math.max(3, (ph - gap * (rows - 1)) / rows);
          const full = pw - lab;
          let out = "";
          for (let r = 0; r < rows; r++) {
            const k = sweep(r, rows, p, q);
            if (k <= 0) continue;
            const y = r * (rh + gap);
            const a = v[r % v.length] * 0.52 * full * k,
              b = v[(r + 5) % v.length] * 0.3 * full * k,
              c = v[(r + 9) % v.length] * 0.16 * full * k;
            if (lab)
              out +=
                '<text x="0" y="' + (y + rh * 0.74).toFixed(1) +
                '" font-family="' + SANS + '" font-size="8" fill="' + AXIS + '">' +
                String.fromCharCode(65 + r) + "</text>";
            /* A hairline of paper between the segments. Two greys that touch
             * are read as one shape however far apart they are on the scale
             * — the eye wants an edge before it will look for a difference,
             * and on a web that edge is the only thing that survives. */
            const seg = (sx, sw, t) =>
              sw <= 0.5
                ? ""
                : '<rect x="' + sx.toFixed(1) + '" y="' + y.toFixed(1) +
                  '" width="' + Math.max(0.5, sw - 1.2).toFixed(1) + '" height="' +
                  rh.toFixed(1) + '" fill="' + value(t, tone) + '"/>';
            out +=
              seg(lab, a, 1) + seg(lab + a, b, 0.56) + seg(lab + a + b, c, 0.14);
          }
          return svgWrap(pw, ph, out);
        });

    LIVE_ART.scatter = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "Each dot, one district", "Two measures, 312 districts",
        (pw, ph) => {
          const n = pw < 130 ? 16 : 34,
            gut = pw < 130 ? 0 : GUT,
            top = 30 + Math.round(rnd() * 50);
          /* The gutter is for the FIGURES, and this one drew its own bare
           * rules and never wrote any — twenty-six pixels of white down the
           * left of every scatter, held for nothing. It uses the same axis
           * the other charts use, which is what the gutter was reserved for
           * in the first place. */
          let out = yAxis(pw, ph, top, gut);
          for (let i = 0; i < n; i++) {
            const k = sweep(i, n, p, q, 1.35);
            const x = gut + 4 + rnd() * (pw - gut - 8),
              y = 4 + rnd() * (ph - 8),
              r0 = 1.8 + rnd() * 2.8;
            if (k <= 0) continue;
            out +=
              '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' +
              (r0 * k).toFixed(1) + '" fill="' +
              // a dot's value is its size, which is the second measure
              value(0.34 + ((r0 - 1.8) / 2.8) * 0.66, tone) + '" opacity=".95"/>';
          }
          return svgWrap(pw, ph, out);
        });

    /* A RING IS A CIRCLE, and a circle in a box that is not square leaves
     * the rest of the box empty. It was drawn against min(w,h) and pinned to
     * the left, so a wide short block put a small ring in one corner with a
     * third of the plot blank beside it, and a tall narrow one put it in the
     * middle of a column of nothing.
     *
     * The layout is chosen from the proportion of the block instead. Wide:
     * the ring takes the height and the key stands beside it. Tall: the ring
     * takes the width and the key lies under it in a row. Square: the ring
     * is centred and the key only appears if there is width to spare. In
     * every case the ring is centred in the space it is actually given. */
    LIVE_ART.donut = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "Of the whole", "Per cent, rounded to the nearest",
        (pw, ph) => {
          const parts = [0.36, 0.27, 0.19, 0.11, 0.07];
          // five classes over the whole spectrum, biggest darkest
          const shade = [1, 0.78, 0.56, 0.34, 0.12].map((t) => value(t, tone));
          const ar = pw / ph;

          let box, cx, cy, key = "";
          const KEYW = 74,
            KEYH = 14;
          if (ar > 1.45 && pw - KEYW > 46 && ph >= 46) {
            // beside: the ring takes the height, the key the strip to its right
            box = Math.min(ph, pw - KEYW - 10);
            cx = (pw - KEYW - 10) / 2;
            cy = ph / 2;
            key = "side";
          } else if (ar < 0.78 && ph - KEYH * 3 > 46) {
            // under: the ring takes the width, the key three rows beneath it
            box = Math.min(pw, ph - KEYH * 3 - 8);
            cx = pw / 2;
            // the RING AND ITS KEY are one object, and it is that object
            // which is centred — centring the ring alone leaves the key
            // hanging and half the block empty under it
            cy = (ph - (box + 8 + KEYH * 3)) / 2 + box / 2;
            key = "under";
          } else {
            box = Math.min(pw, ph);
            cx = pw / 2;
            cy = ph / 2;
            key = pw - box > 84 && ph >= 46 ? "side" : "";
            if (key === "side") cx = (pw - KEYW - 10) / 2;
          }
          const R0 = box / 2 - 1,
            R1 = R0 * 0.6;

          const arc = (a0, a1, fill) => {
            const P = (a, r) => [
              (cx + r * Math.cos(a)).toFixed(1),
              (cy + r * Math.sin(a)).toFixed(1),
            ];
            const big = a1 - a0 > Math.PI ? 1 : 0;
            const [x0, y0] = P(a0, R0), [x1, y1] = P(a1, R0),
              [x2, y2] = P(a1, R1), [x3, y3] = P(a0, R1);
            return '<path d="M' + x0 + " " + y0 + " A" + R0 + " " + R0 + " 0 " +
              big + " 1 " + x1 + " " + y1 + " L" + x2 + " " + y2 + " A" + R1 +
              " " + R1 + " 0 " + big + " 0 " + x3 + " " + y3 + ' Z" fill="' + fill +
              // the same hairline of paper the stack needs, for the same reason
              '" stroke="#ffffff" stroke-width="1.4"/>';
          };

          // one sweep round the ring: p is its leading edge, q its trailing
          const TAU = Math.PI * 2;
          const lead = clamp01(p) * TAU,
            trail = clamp01(q) * TAU;
          const swatch = (x, y, i) =>
            '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
            '" width="8" height="8" rx="1.5" fill="' + shade[i] + '"/>' +
            '<text x="' + (x + 12).toFixed(1) + '" y="' + (y + 7.6).toFixed(1) +
            '" font-family="' + SANS + '" font-size="8" fill="' + AXIS + '">' +
            Math.round(parts[i] * 100) + "%</text>";

          let a = 0, out = "", keys = "";
          for (let i = 0; i < parts.length; i++) {
            const s0 = Math.max(a, trail),
              s1 = Math.min(a + parts[i] * TAU, lead);
            if (s1 - s0 > 0.005) out += arc(s0 - Math.PI / 2, s1 - Math.PI / 2, shade[i]);
            a += parts[i] * TAU;
            if (i > 2) continue;
            if (key === "side")
              keys += swatch(pw - KEYW, cy - 22 + i * KEYH + 2, i);
            else if (key === "under")
              keys += swatch(pw / 2 - 22, cy + box / 2 + 8 + i * KEYH, i);
          }
          return svgWrap(pw, ph, out + keys);
        });

    // ---- maps, on real geography -------------------------------------
    /* Natural Earth's outlines, projected to Robinson and baked into geo.js.
     * A choropleth of tinted squares is a heatmap; a map has to be somewhere.
     *
     * The crop is chosen by the SHAPE OF THE HOLE, not by taste. A block two
     * columns wide and short takes the world; a block the shape of a single
     * column takes a continent, because the world squeezed into it would be
     * a strip of grey nothing. That is what responsive means for a map. */
    const geo = () => (typeof window !== "undefined" && window.GEO) || null;
    const ISOS = () => Object.keys(geo().c);
    /* The crop is chosen by PROPORTION, not by a threshold. Fitting a
     * hemisphere into a hole two columns wide and a paragraph deep sizes the
     * map by its height and leaves it occupying a third of the width, with
     * the rest white — the map was there and the block still read as empty.
     * The one whose shape is nearest the hole's wins, on a log ratio so that
     * being twice too wide costs the same as being twice too tall; among
     * those close enough to be interchangeable the page's own source picks,
     * so two pages do not open on the same continent. */
    const cropFor = (w, h, rnd) => {
      const G = geo(),
        ar = w / h;
      const keys = Object.keys(G.crops);
      const cost = (k) => {
        const c = G.crops[k];
        return Math.abs(Math.log((c[2] - c[0]) / (c[3] - c[1]) / ar));
      };
      const best = Math.min.apply(null, keys.map(cost));
      const near = keys.filter((k) => cost(k) < best + 0.28);
      return G.crops[near[Math.floor(rnd() * near.length)]];
    };
    /* A MAP IS TWO LAYERS, and only one of them moves.
     *
     * Rasterising a hundred and sixty-seven country outlines forty times
     * over an arrival is minutes of decoding for two seconds of animation,
     * and it showed: the three maps that draw marks on land sat blank
     * because a new request went out before the last had come back. The
     * land is drawn once and kept; only the circles and the lines are made
     * again. layer 1 is the ground, 2 the marks, 0 both — and the random
     * stream is consumed identically whichever is asked for, so the two
     * layers are always of the same place. */
    const mapBase = (w, h, rnd, paint) => {
      const G = geo();
      if (!G) return "";
      const [x0, y0, x1, y1] = cropFor(w, h, rnd);
      const cw = x1 - x0,
        ch = y1 - y0;
      // fit the crop inside the hole without distorting the projection
      const s = Math.min(w / cw, h / ch);
      const vw = w / s,
        vh = h / s;
      const vx = x0 - (vw - cw) / 2,
        vy = y0 - (vh - ch) / 2;
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
        '" viewBox="' + vx.toFixed(1) + " " + vy.toFixed(1) + " " + vw.toFixed(1) +
        " " + vh.toFixed(1) + '">' + paint(1 / s, vx, vy, vw, vh) + "</svg>"
      );
    };

    LIVE_ART.choro = (w, h, p, q, v, tone, rnd, layer) =>
      chrome(w, h, "Rate by country", "Boundaries: Natural Earth · Rates: national returns",
        (pw, ph) => {
          const G = geo();
          if (!G) return "";
          const iso = ISOS();
          // a real sequential ramp, not one ink at five opacities
          // paper to ink in five steps, so a country's class can be read off
          // the map without going back to a key
          const ramp = (t) => value(0.1 + Math.round(t * 4) * 0.225, tone);
          return mapBase(pw, ph, rnd, (u) => {
            let out = "";
            for (let i = 0; i < iso.length; i++) {
              const k = sweep(i, iso.length, p, q, 1.6);
              const t = v[i % v.length];
              out +=
                '<path d="' + G.c[iso[i]] + '" fill="' +
                (layer === 2 ? "none" : k > 0.5 ? ramp(t) : LAND) +
                '" stroke="' + (layer === 2 ? "none" : "#ffffff") +
                '" stroke-width="' + (0.6 * u).toFixed(2) + '"/>';
            }
            return out;
          });
        });

    LIVE_ART.places = (w, h, p, q, v, tone, rnd, layer) =>
      chrome(w, h, "Where reported", "One circle, one city",
        (pw, ph) => {
          const G = geo();
          if (!G) return "";
          return mapBase(pw, ph, rnd, (u, vx, vy, vw, vh) => {
            let out = "";
            if (layer !== 2)
              for (const k of ISOS())
                out += '<path d="' + G.c[k] + '" fill="' + LAND +
                  '" stroke="#ffffff" stroke-width="' + (0.6 * u).toFixed(2) + '"/>';
            /* A CIRCLE HAS TO FIT INSIDE THE WINDOW, not just its centre. A
             * city sitting a pixel from the edge of the crop was given a
             * ten-pixel bubble and the bubble was cut in half by the frame,
             * which reads as a rendering fault rather than as a place. The
             * margin is the largest mark this drawing can make, so the
             * cities near the edge are simply not among the ones it uses. */
            const M = (2.4 + 7 + 1.2) * u;
            const here = G.cities.filter(
              (c) =>
                c[1] > vx + M && c[1] < vx + vw - M &&
                c[2] > vy + M && c[2] < vy + vh - M,
            );
            const n = Math.min(here.length, 22);
            for (let i = 0; i < n; i++) {
              const c = here[Math.floor((i / n) * here.length)];
              const kk = sweep(i, n, p, q, 1.4);
              if (kk <= 0) continue;
              const r = (2.4 + v[i % v.length] * 7) * kk * u;
              if (layer === 1) continue;
              out +=
                '<circle cx="' + c[1] + '" cy="' + c[2] + '" r="' + r.toFixed(2) +
                '" fill="' + tone + '" fill-opacity=".55" stroke="' + tone +
                '" stroke-width="' + (1.1 * u).toFixed(2) + '"/>';
            }
            return out;
          });
        });

    LIVE_ART.flows = (w, h, p, q, v, tone, rnd, layer) =>
      chrome(w, h, "Origin and destination", "Movements recorded, 2026",
        (pw, ph) => {
          const G = geo();
          if (!G) return "";
          return mapBase(pw, ph, rnd, (u, vx, vy, vw, vh) => {
            let out = "";
            if (layer !== 2)
              for (const k of ISOS())
                out += '<path d="' + G.c[k] + '" fill="' + LAND +
                  '" stroke="#ffffff" stroke-width="' + (0.6 * u).toFixed(2) + '"/>';
            // the arc rises above the higher of its two ends, so the window
            // has to hold the crown as well as the endpoints
            const M = 6 * u,
              CROWN = vh * 0.3;
            const here = G.cities.filter(
              (c) =>
                c[1] > vx + M && c[1] < vx + vw - M &&
                c[2] > vy + CROWN && c[2] < vy + vh - M,
            );
            if (here.length < 3) return out;
            const hub = here[Math.floor(rnd() * here.length)];
            const n = Math.min(9, here.length - 1);
            let dots = "";
            for (let i = 0; i < n; i++) {
              const c = here[Math.floor(rnd() * here.length)];
              const kk = sweep(i, n, p, q, 1.25);
              if (kk <= 0 || c === hub || layer === 1) continue;
              const mx = (hub[1] + c[1]) / 2,
                my = Math.max(
                  vy + M,
                  (hub[2] + c[2]) / 2 -
                    Math.hypot(c[1] - hub[1], c[2] - hub[2]) * 0.3,
                );
              const ex = hub[1] + (c[1] - hub[1]) * kk,
                ey = hub[2] + (c[2] - hub[2]) * kk;
              out +=
                '<path d="M' + hub[1] + " " + hub[2] + " Q" + mx.toFixed(1) + " " +
                my.toFixed(1) + " " + ex.toFixed(1) + " " + ey.toFixed(1) +
                '" fill="none" stroke="' + tone + '" stroke-width="' +
                ((0.9 + v[i % v.length] * 1.8) * u).toFixed(2) +
                '" opacity=".85" stroke-linecap="round"/>';
              if (kk > 0.98)
                dots += '<circle cx="' + c[1] + '" cy="' + c[2] + '" r="' +
                  (2.2 * u).toFixed(2) + '" fill="#fff" stroke="' + DINK +
                  '" stroke-width="' + (1.2 * u).toFixed(2) + '"/>';
            }
            if (layer === 1) return out;
            return out + dots + '<circle cx="' + hub[1] + '" cy="' + hub[2] +
              '" r="' + (3.4 * u).toFixed(2) + '" fill="' + DINK + '"/>';
          });
        });

    LIVE_ART.route = (w, h, p, q, v, tone, rnd, layer) =>
      chrome(w, h, "The route, stop by stop", "Stages of the journey",
        (pw, ph) => {
          const G = geo();
          if (!G) return "";
          return mapBase(pw, ph, rnd, (u, vx, vy, vw, vh) => {
            let out = "";
            if (layer !== 2)
              for (const k of ISOS())
                out += '<path d="' + G.c[k] + '" fill="' + LAND +
                  '" stroke="#ffffff" stroke-width="' + (0.6 * u).toFixed(2) + '"/>';
            const M = 5 * u;
            const here = G.cities
              .filter(
                (c) =>
                  c[1] > vx + M && c[1] < vx + vw - M &&
                  c[2] > vy + M && c[2] < vy + vh - M,
              )
              .sort((a, b) => a[1] - b[1]);
            if (here.length < 4) return out;
            const n = Math.min(7, here.length);
            const S = [];
            for (let i = 0; i < n; i++)
              S.push(here[Math.floor((i / (n - 1)) * (here.length - 1))]);
            const [from, to] = span(n, p, q);
            if (to <= from || layer === 1) return out;
            const at = (f) => {
              const i = Math.max(0, Math.min(n - 2, Math.floor(f))),
                k = f - i;
              return [
                S[i][1] + (S[i + 1][1] - S[i][1]) * k,
                S[i][2] + (S[i + 1][2] - S[i][2]) * k,
              ];
            };
            const a = at(from),
              b = at(to);
            let d = "M" + a[0].toFixed(1) + " " + a[1].toFixed(1),
              dots = "";
            for (let i = Math.ceil(from); i <= Math.floor(to); i++) {
              d += " L" + S[i][1] + " " + S[i][2];
              dots += '<circle cx="' + S[i][1] + '" cy="' + S[i][2] + '" r="' +
                (2.6 * u).toFixed(2) + '" fill="#fff" stroke="' + DINK +
                '" stroke-width="' + (1.3 * u).toFixed(2) + '"/>';
            }
            d += " L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
            return out + '<path d="' + d + '" fill="none" stroke="' + tone +
              '" stroke-width="' + (2.4 * u).toFixed(2) +
              '" stroke-linejoin="round" stroke-linecap="round"/>' + dots;
          });
        });

    LIVE_ART.rings = (w, h, p, q, v, tone, rnd, layer) =>
      chrome(w, h, "Reach from the centre", "Distance bands, in hundreds of km",
        (pw, ph) => {
          const G = geo();
          if (!G) return "";
          return mapBase(pw, ph, rnd, (u, vx, vy, vw, vh) => {
            let out = "";
            if (layer !== 2)
              for (const k of ISOS())
                out += '<path d="' + G.c[k] + '" fill="' + LAND +
                  '" stroke="#ffffff" stroke-width="' + (0.6 * u).toFixed(2) + '"/>';
            const here = G.cities.filter(
              (c) => c[1] > vx + vw * 0.2 && c[1] < vx + vw * 0.8 &&
                c[2] > vy + vh * 0.2 && c[2] < vy + vh * 0.8,
            );
            const c = here.length ? here[Math.floor(rnd() * here.length)]
              : [null, vx + vw / 2, vy + vh / 2];
            /* The OUTERMOST BAND is what has to fit. Sized off the window and
             * drawn round a centre anywhere in it, the widest ring ran off
             * two sides at once — a set of contours cut by the frame is not
             * a reading of distance, it is a mistake. It is the smallest
             * distance from the centre to an edge instead. */
            const n = 5,
              max =
                Math.min(
                  Math.min(vw, vh) * 0.44,
                  c[1] - vx,
                  vx + vw - c[1],
                  c[2] - vy,
                  vy + vh - c[2],
                ) *
                0.97;
            if (layer === 1) return out;
            for (let i = n - 1; i >= 0; i--) {
              const k = sweep(n - 1 - i, n, p, q, 1.2);
              if (k <= 0) continue;
              const r = max * ((i + 1) / n) * k;
              out += '<circle cx="' + c[1] + '" cy="' + c[2] + '" r="' + r.toFixed(1) +
                '" fill="' + tone + '" fill-opacity="' + (0.05).toFixed(2) +
                '" stroke="' + tone + '" stroke-width="' + (1.2 * u).toFixed(2) +
                '" stroke-opacity="' + (0.55 + (1 - i / n) * 0.45).toFixed(2) + '"/>';
            }
            return out + '<circle cx="' + c[1] + '" cy="' + c[2] + '" r="' +
              (2.6 * u).toFixed(2) + '" fill="' + DINK + '"/>';
          });
        });

    LIVE_ART.units = (w, h, p, q, v, tone, rnd) =>
      chrome(w, h, "One square, a thousand", "Counted, not estimated",
        (pw, ph) => {
          const cols = pw < 130 ? 14 : 24,
            cell = pw / cols,
            rows = Math.max(2, Math.floor(ph / cell)),
            n = rows * cols;
          const oy = (ph - rows * cell) / 2;
          let out = "";
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
              const i = r * cols + c;
              const k = sweep(i, n, p, q, 1.5);
              /* THE GAP IS PROPORTIONAL, and wider than it was. A fixed
               * 1.2 texels between cells vanishes at the size the reel
               * draws these, and a grid whose gaps have gone is not a grid:
               * it is a filled rectangle, which is what this looked like on
               * the webs however light its cells were. A fifth of a cell
               * survives the paper. */
              const gap = Math.max(0.8, cell * 0.2);
              out +=
                '<rect x="' + (c * cell + gap / 2).toFixed(2) + '" y="' +
                (oy + r * cell + gap / 2).toFixed(2) + '" width="' +
                (cell - gap).toFixed(2) + '" height="' + (cell - gap).toFixed(2) +
                '" fill="' +
                (k > 0.5 ? value(i / n > 0.72 ? 0.26 : 0.86, tone) : PALE) + '"/>';
            }
          return svgWrap(pw, ph, out);
        });


    /* WHAT SHAPE OF HOLE EACH DRAWING WILL ACCEPT.
     *
     * Not every drawing survives every block. A bar chart standing in a
     * single column of a three-column page has bars a pixel and a half wide
     * against an axis it cannot afford; a line has three points of run for
     * two hundred of fall. Of the charts only the unit square works upright,
     * because a grid does not care which way it is longer. A ring is worse
     * still: it is a circle, so anything but a square wastes the block on
     * either side of it however the key is placed.
     *
     * The maps take any shape, which is the whole point of choosing the crop
     * by proportion — there is always a piece of the world that is the shape
     * of the hole. */
    const PORTRAIT = 0.95;
    const FITS = {
      bars: (ar) => ar >= PORTRAIT,
      line: (ar) => ar >= PORTRAIT,
      area: (ar) => ar >= PORTRAIT,
      stack: (ar) => ar >= PORTRAIT,
      scatter: (ar) => ar >= PORTRAIT,
      donut: (ar) => ar > 0.82 && ar < 1.28,
    };
    const fits = (kind, ar) => !FITS[kind] || FITS[kind](ar);

    /* DEALT, NOT DRAWN. Six pages each picking a drawing at random gave
     * three the same one — independent draws collide, and two webs showing
     * the same chart at once is exactly the redundancy this is meant to
     * avoid. The kinds are a deck instead: shuffled, dealt one at a time,
     * and reshuffled only when it runs out, so no page can repeat another
     * until every one has been seen.
     *
     * The deal now takes the shape of the hole with it and passes over any
     * card that will not go in it, leaving those cards in the deck for a
     * block that suits them. */
    let KIND_DECK = [];
    const cut = (rnd) => {
      KIND_DECK = LIVE_KINDS.slice();
      for (let i = KIND_DECK.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const t = KIND_DECK[i];
        KIND_DECK[i] = KIND_DECK[j];
        KIND_DECK[j] = t;
      }
    };
    function dealKind(rnd, ar, taken) {
      const free = (kind) =>
        fits(kind, ar) && (!taken || taken.indexOf(kind) < 0);
      for (let pass = 0; pass < 3; pass++) {
        if (!KIND_DECK.length) cut(rnd);
        for (let i = KIND_DECK.length - 1; i >= 0; i--)
          if (free(KIND_DECK[i])) return KIND_DECK.splice(i, 1)[0];
        // nothing left in this deck goes in this hole: cut a fresh one
        KIND_DECK.length = 0;
      }
      // last resort: anything that fits, even if it is already on a web
      for (let i = 0; i < LIVE_KINDS.length; i++)
        if (fits(LIVE_KINDS[i], ar)) return LIVE_KINDS[i];
      return "units";
    }

    /* One rasterisation. The markup is wrapped as XHTML inside an SVG the
     * size of the drawing, handed to an Image as a data URI, and decoded. */
    // the kinds whose ground is worth keeping: everything they draw sits on
    // a hundred and sixty-seven country outlines that never change
    const GROUNDED = ["places", "flows", "route", "rings"];
    const GROUND = new Map();

    /* DRAWN AT TWICE THE SIZE IT IS LAID OUT AT.
     *
     * The layers of a map are composed into a canvas, and a canvas is a
     * bitmap: made at the raster width and then drawn into a hole wider than
     * that — or onto a screen at two device pixels to one — it is upscaled,
     * and upscaling a bitmap is exactly what pixelation is. The choropleth
     * escaped it because it is a single SVG image and the browser
     * re-rasterises those at whatever size they are drawn; the four maps
     * that carry marks did not, and looked it.
     *
     * The fix is at the source: the SVG keeps a viewBox of the layout size,
     * so everything inside it is composed at exactly the same measurements,
     * and is given twice that in width and height. Same drawing, four times
     * the pixels, and the composite has resolution to spare wherever it
     * lands. */
    /* A DECODE IS A FRAME. Measured: rasterising one of these costs between
     * one and eight milliseconds on the main thread, and at a hundred and
     * twenty frames a second the whole budget is eight point three. Chrome
     * will not decode an SVG off-thread — createImageBitmap refuses the
     * blob outright — so the only levers are how big each one is and how
     * many there are.
     *
     * 1.6 rather than 2 is a third fewer pixels and still well clear of the
     * pixelation this was raised to fix: the composite is a bitmap, and
     * what it needs is to be made larger than the hole it lands in, not
     * twice as large. */
    /* And never coarser than the sheet it lands on: the galley is stored at
     * GALLEY_SS texels to the unit, so a drawing rasterised at 1.6 would be
     * the one soft thing on a page of sharp type. Settled with the sheet. */
    let RSCALE = 1.6;
    /* And no more than two drawings are ever being made at once. The pages
     * are staggered so this is usually true anyway, but usually is not a
     * bound — three arrivals landing together put three decodes in three
     * consecutive frames, which is what a hundred and twenty drops from. */
    /* SEVERAL STAGES IN FLIGHT AT ONCE.
     *
     * One per hole meant the arrival ran at one over the round trip — about
     * fifteen stages a second — while the machine sustains hundreds. The
     * round trip is latency, not work: the picture is decoded off the
     * critical path and only its callback waits for a frame. Asking for the
     * next stage before the last has landed spends that latency instead of
     * queueing behind it.
     *
     * Order is kept by a stamp rather than by waiting. A stage that comes
     * back after a newer one has already been shown is dropped — it is a
     * picture of a moment that has passed, and drawing it would run the
     * arrival backwards for a frame. */
    const RASTER_LIMIT = 5;
    /* HOW EACH DRAWING ARRIVES.
     *
     * One wipe for everything was a retreat, and it was not the necessary
     * one. What made the old gestures expensive was that each stage of them
     * was a separate rasterisation — not the gestures themselves. A clip
     * can reproduce most of them EXACTLY over a single finished picture,
     * and where it cannot it can do the same thing the drawing does.
     *
     *  traced  a path drawn from its start, which is a left edge advancing
     *          — for a line, an area, a route, arcs from a hub. This is not
     *          an approximation of the old gesture: it is the same one.
     *  rise    bars coming up out of the baseline, which is a bottom edge
     *          lifting. All of them together rather than staggered, which
     *          is the one thing a clip cannot do to a flat picture.
     *  extend  a horizontal bar reaching to the right, and the reading
     *          order of anything laid out across the page.
     *  rows    a grid filling in reading order: whole rows, then part of
     *          the next one. Exactly what the unit square and the
     *          choropleth used to do a cell at a time.
     *  sweep   round from twelve o'clock, for a ring.
     *  grow    out from the centre, for contours — which is what contours
     *          did, from the middle outwards.
     */
    const ARRIVAL = {
      bars: "rise",
      stack: "extendRows",
      line: "traced",
      area: "traced",
      route: "traced",
      flows: "traced",
      scatter: "extend",
      places: "extend",
      units: "rows",
      choro: "rows",
      donut: "sweep",
      rings: "grow",
    };
    /* Where the title and the source line sit, worked out the same way
     * chrome() works them out. A gesture that runs over them cuts a word in
     * half, and half a word reads as a fault rather than as a drawing being
     * made — so they land whole, the label first and the credit last, which
     * is the order a desk does it in. */
    const titleBand = (w, h) =>
      h >= 90 && w >= 96 ? (h < 74 ? 4 : h < 118 ? 7 : 11) + 14 : 0;
    const footBand = (w, h) => (h >= 124 && w >= 120 ? 20 : 0);
    let rasterBusy = 0;
    function rasterOne(kind, w, h, p, q, v, tone, seed, layer) {
      const body = (LIVE_ART[kind] || LIVE_ART.bars)(
        w, h, p, q, v, tone, seeded(seed), layer,
      );
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * RSCALE +
        '" height="' + h * RSCALE + '" viewBox="0 0 ' + w + " " + h + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + "px;height:" + h +
        "px;background:" + (layer === 2 ? "transparent" : "#ffffff") +
        ';font:10px Georgia,serif;color:#161616;overflow:hidden">' +
        body + "</div></foreignObject></svg>";
      return new Promise((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    }

    /* One picture, however many layers it took. Returns a canvas rather than
     * an image, because a composite is what the caller wants and building it
     * here means the ground is fetched once per size and never again. */
    async function rasterise(kind, w, h, p, q, v, tone, rnd, seed) {
      const sd = seed === undefined ? 1 : seed;
      if (GROUNDED.indexOf(kind) < 0)
        return rasterOne(kind, w, h, p, q, v, tone, sd, 0);
      const key = kind + "|" + w + "|" + h + "|" + tone + "|" + sd;
      let ground = GROUND.get(key);
      if (ground === undefined) {
        ground = await rasterOne(kind, w, h, 1, 0, v, tone, sd, 1);
        /* Bounded, because the hole is cut afresh at the top of every
         * telling and each new size is a new world. Oldest out first: a
         * ground from four tellings ago will not be asked for again. */
        if (GROUND.size > 24) GROUND.delete(GROUND.keys().next().value);
        GROUND.set(key, ground);
      }
      const marks = await rasterOne(kind, w, h, p, q, v, tone, sd, 2);
      if (!ground && !marks) return null;
      const c = document.createElement("canvas");
      c.width = w * RSCALE;
      c.height = h * RSCALE;
      const g = c.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      if (ground) g.drawImage(ground, 0, 0, c.width, c.height);
      if (marks) g.drawImage(marks, 0, 0, c.width, c.height);
      return c;
    }

    /* The bench publishes the drawings themselves, so the catalogue can put
     * them on a board out of the paper and they can be judged as drawings.
     * The same functions the reel runs — not a copy of them, which would
     * drift the moment either was touched. */
    window.__liveArt = LIVE_ART;
    window.__liveKinds = LIVE_KINDS;
    window.__liveCharts = CHARTS;
    window.__liveMaps = MAPS;
    window.__seeded = seeded;
    window.__rasterise = (kind, w, h, p, q, v, tone, seed) =>
      rasterise(kind, w, h, p, q, v, tone, null, seed);
    window.__castValues = castValues;
    window.__fits = fits; // which shapes of hole a drawing will accept

    /* HOW THE STORY IS TOLD, as two curves over one turn of it.
     *
     * They are separate on purpose. The room is made FIRST and the drawing
     * arrives INTO it — that order is the whole claim: the desk does not
     * replace the article, it makes space in it. A single curve doing both
     * at once would show a graphic growing while the text retreated from it,
     * which reads as the drawing shoving the words aside. */
    const storySecs = () => Math.max(2, P.storySecs || 8.5);
    /* AND THEN THE PAGE IS LEFT ALONE. Without a rest the text closes over
     * one graphic and opens for the next in the same breath, which reads as
     * a slot machine rather than as a desk working — the article never gets
     * to be an article. The rest is the page as printed, and it is the state
     * a reader should find it in most of the time.
     *
     * It is also the cheapest state there is: nothing to rasterise, nothing
     * to set again, nothing written back to the reel. With six pages spread
     * evenly through the cycle it means two or three are ever doing
     * anything at once. */
    /* And the rest is what the page waits before it opens, once it is in
     * shot: a moment as printed, so a reader meets the article before the
     * desk starts working on it. */
    const storyRest = () =>
      Math.max(0, P.storyRest === undefined ? 1.5 : P.storyRest);
    // and how far apart the pages take their turns
    const storySpread = () =>
      Math.max(0, P.storySpread === undefined ? 5 : P.storySpread);
    const ease = (u) => u * u * (3 - 2 * u);
    /* THE TELLING ONLY GOES ONE WAY. The room is made, the drawing arrives,
     * and it STAYS — for as long as the page is on screen, which is as long
     * as anybody could be reading it. Nothing is taken away in front of a
     * reader; a graphic that leaves while you are looking at it is one you
     * were not allowed to finish. The page is closed and recast only after
     * it has run out of shot, so what comes back round is a fresh article
     * that opens again. There is no departure curve any more, because there
     * is no departure. */
    const storyOpen = (u) => (u < 0.04 ? 0 : ease(clamp01((u - 0.04) / 0.3)));
    const storyDraw = (u) => (u < 0.24 ? 0 : ease(clamp01((u - 0.24) / 0.42)));

    /* ONE JOB PER HOLE, not one per drawing. Sharing them was a real bug:
     * four copies of a page are at four different points in the telling, so
     * a shared picture showed one page the chart belonging to another, and
     * a cached half-drawn level kept numbers from whenever it was first
     * made — the bars jumped around as the graphic grew instead of rising.
     * A hole owns its picture, and asks for a new one when it wants it. */
    /* THE ROOM IS MADE BEFORE THE DRAWING EXISTS, and for a moment there
     * is a hole in the page with nothing in it. That gap is not a fault to
     * hide — it is the desk working, and the honest thing to put in it is
     * who is doing the work.
     *
     * One word, and a light passing over it. A bar filling to a number
     * nobody knows is a lie about progress; a shimmer says only that
     * something is happening, which is the truth and is all a wait this
     * short can honestly claim.
     *
     * Drawn in canvas rather than rasterised, so it is there in the frame
     * the hole opens — the one thing a raster cannot promise — and at one
     * size whatever the hole. Scaling it with the block made the same word
     * bigger in a lead than in a column, so it read as part of the
     * graphic's own hierarchy, which it is not: it is a label about the
     * page's state, and those are the same size everywhere. */
    /* The mark itself, as a path rather than a file: Path2D takes SVG path
     * data straight, so the rosette in landing/marks is the same three
     * drops here as it is in the header — one shape, not a copy of one. */
    const ROSETTE = typeof Path2D === "undefined"
      ? null
      : new Path2D(
          "M51.043 32.561L42.02 51.064A11.148 11.148 0 1 1 30.616 35.116Z " +
          "M17.9 41.122L6.387 24.057A11.148 11.148 0 1 1 25.9 22.154Z " +
          "M27.057 8.139L47.593 6.701A11.148 11.148 0 1 1 39.484 24.551Z",
        );
    function mark(g2, inner, t, alpha) {
      const cx = inner.x + inner.w / 2,
        cy = inner.y + inner.h / 2,
        fs2 = 11;
      g2.save();
      g2.globalAlpha = alpha;

      /* THE ROSETTE, TURNING. Three drops around a triangular void, which
       * is a shape that says something while it moves and nothing while it
       * sits still — so it turns, and the turning is the wait. It is the
       * mark itself rather than a word about it, which is the shorter way
       * of saying the same thing. */
      if (P.markLogo > 0.5 && ROSETTE) {
        const sz = 22;
        /* About its CENTRE OF MASS, not the middle of its box. They are
         * different points on this mark — the box is centred at 32,32 of
         * the viewBox and the ink at 31.9,27.2, because three drops round a
         * triangular void carry their weight high. Spun about the box it
         * swings; spun about its mass it turns. */
        g2.translate(cx, cy);
        g2.rotate(t * 1.6);
        g2.scale(sz / 64, sz / 64);
        g2.translate(-31.93, -27.21);
        // pale: it is a placeholder, and a placeholder that holds the
        // eye is competing with the thing it is holding a place for
        g2.fillStyle = "#d2cdc4";
        g2.fill(ROSETTE);
        g2.restore();
        return;
      }

      g2.textAlign = "center";
      g2.textBaseline = "middle";
      g2.font = "600 " + fs2 + "px " + SANS;
      const half = g2.measureText("Splash").width / 2 + fs2;
      // the light travels across the word and rests before it returns
      const sweep = (((t * 0.75) % 1.9) / 1.9) * 2.4 - 0.7;
      const grd = g2.createLinearGradient(cx - half, 0, cx + half, 0);
      const at = (u) => Math.max(0, Math.min(1, u));
      grd.addColorStop(0, "#d2cdc4");
      grd.addColorStop(at(sweep - 0.22), "#d2cdc4");
      grd.addColorStop(at(sweep), "#f4f2ec");
      grd.addColorStop(at(sweep + 0.22), "#d2cdc4");
      grd.addColorStop(1, "#d2cdc4");
      g2.fillStyle = grd;
      g2.fillText("Splash", cx, cy);
      g2.restore();
    }

    /* THE POINTER, FOLLOWED SLOWLY.
     *
     * Raw coordinates make the paper snap about with the cursor, which is a
     * cursor effect and not a sheet: newsprint has weight and arrives late.
     * The position is eased towards the pointer and the press eased down
     * when it leaves, so the bulge fills and empties rather than switching.
     *
     * In CLIP space, because that is what can be turned into a position on
     * a particular sheet — the same cursor is somewhere different on each
     * of the three, and where depends on how far away that one is. */
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, k: 0, on: 0 };
    function ptrTrack(e) {
      ptr.tx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
      ptr.ty = 1 - (e.clientY / Math.max(1, innerHeight)) * 2;
      ptr.on = 1;
    }
    if (typeof addEventListener === "function") {
      addEventListener("pointermove", ptrTrack, { passive: true });
      addEventListener("pointerdown", ptrTrack, { passive: true });
      addEventListener("pointerleave", () => (ptr.on = 0), { passive: true });
      // a finger is not a hand resting on the page: it presses and goes
      addEventListener("pointerup", () => (ptr.on = 0), { passive: true });
    }
    function ptrStep(dt) {
      const e = Math.min(1, dt * 6);
      ptr.x += (ptr.tx - ptr.x) * e;
      ptr.y += (ptr.ty - ptr.y) * e;
      const want = ptr.on ? 1 : 0;
      ptr.k += (want - ptr.k) * Math.min(1, dt * 3.5);
    }

    /* WRITING A RECTANGLE OF THE REEL BACK TO THE CARD.
     *
     * The page is drawn in logical units and stored at GALLEY_SS device
     * texels to the unit, so a rectangle is scaled on its way to the card.
     * One scratch canvas for the whole module, grown to the largest write
     * there has been and never shrunk: texSubImage2D is told the width and
     * height it is to read, so a scratch bigger than the write is simply not
     * read past. A canvas per hole was three megabytes each at this
     * resolution, and there are eighteen holes. */
    let galleyScratch = null,
      galleyScratchG = null;
    function putGalley(x, y, w, h) {
      const S = GALLEY_SS;
      const dx = Math.max(0, Math.round(x * S)),
        dy = Math.max(0, Math.round(y * S));
      const dw = Math.min(galleyCv.width - dx, Math.round(w * S)),
        dh = Math.min(galleyCv.height - dy, Math.round(h * S));
      if (dw <= 0 || dh <= 0) return;
      if (!galleyScratch) {
        galleyScratch = document.createElement("canvas");
        galleyScratch.width = dw;
        galleyScratch.height = dh;
        galleyScratchG = galleyScratch.getContext("2d");
      } else if (galleyScratch.width < dw || galleyScratch.height < dh) {
        galleyScratch.width = Math.max(dw, galleyScratch.width);
        galleyScratch.height = Math.max(dh, galleyScratch.height);
        galleyScratchG = galleyScratch.getContext("2d");
      }
      galleyScratchG.clearRect(0, 0, dw, dh);
      galleyScratchG.drawImage(galleyCv, dx, dy, dw, dh, 0, 0, dw, dh);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, dx, dy, dw, dh, gl.RGBA, gl.UNSIGNED_BYTE,
        galleyScratch,
      );
    }

    let liveLast = -1;
    function liveTick(t, dt) {
      if (!galleyCv || !galleyTex || !LIVE_HOLES.length) return;
      /* ASKED EVERY FRAME. The gate used to be one over sixty, which at
       * sixty frames a second is the frame period itself — so it passed on
       * alternate frames and the arrival ran at half the rate it could,
       * measured at sixteen stages a second when the round trip is one
       * point eight milliseconds. A gate set to exactly the thing it is
       * gating is not a limit, it is a coin toss. */
      const ask = true;
      const step = liveLast < 0 ? 1 / 60 : t - liveLast;
      liveStep(Math.min(0.12, step));
      liveLast = t;

      let wrote = false;
      const g2 = galleyCv.getContext("2d");
      // the presses draw in page units; the sheet under them is GALLEY_SS
      // times that in each direction, and this is the only place that knows
      g2.setTransform(GALLEY_SS, 0, 0, GALLEY_SS, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, galleyTex);

      /* Closed and put back the way it was printed. Only ever run on a page
       * that has left the frame, which is the whole point of it. */
      const shut = (k) => {
        g2.save();
        g2.beginPath();
        g2.rect(k.x, k.y, k.w, k.h);
        g2.clip();
        g2.fillStyle = "#ffffff";
        g2.fillRect(k.x, k.y, k.w, k.h);
        g2.textBaseline = "alphabetic";
        k.paint(0);
        g2.restore();
        putGalley(k.x, k.y, k.w, k.h);
      };

      for (const k of LIVE_HOLES) {
        /* IN SHOT IS THE CLOCK. The telling ran on a global cycle, so a page
         * opened and closed on its own schedule whether or not anyone could
         * see it — and it took the graphic away in front of a reader. It
         * starts when the page comes into the frame and it does not end.
         *
         * Leaving is wider than entering by design: a page sitting exactly
         * on the edge would otherwise flicker between recast and closed once
         * a frame, which is a page that never gets to open. */
        // the give is a fifth of a PAGE, not a tenth of the reel: at nine
        // pages the old figure was most of a page and nothing ever left
        // in shot, and standing still: a web that has not finished arriving
        // carries pages that do not move
        const vis =
          (WEB_INE[k.col || 0] > 0.999 || k.seen) &&
          inShot(k.y, k.y + k.h, k.seen ? PAGE_STEP * 0.2 : 0, k.col);
        let open = 1,
          draw = 1;
        if (k.story) {
          if (vis && !k.seen) {
            k.seen = true;
            k.t0 = t;
            /* THEY DO NOT ALL OPEN AT ONCE. The three webs between them hold
             * most of the reel, so when the hero arrives every page comes
             * into shot in the same frame — and with one wait for all of
             * them the whole set opened together, which is a machine
             * starting, not a desk working. Each page waits its own turn: an
             * ordered share of the spread by its place on the reel, jittered
             * so the cascade is not a metronome either. */
            k.wait =
              storyRest() +
              ((k.slot + seeded(k.seed)() * 0.7) / Math.max(1, REEL.length)) *
                storySpread();
            k.recast();
            k.lastOpen = undefined;
            k.lastDraw = undefined;
            k.img = null;
            k.asked = -1;
            k.shown = 0;
            k.seq = 0;
          }
          if (!vis) {
            if (k.seen) {
              k.seen = false;
              k.img = null;
              k.asked = -1;
              // and it is not part-way through anything any more, which is
              // what it still looked like to anything reading k.draw
              k.draw = 0;
              k.leave = 0;
              shut(k);
              wrote = true;
            }
            continue;
          }
          const u = clamp01((t - k.t0 - (k.wait || 0)) / storySecs());
          open = storyOpen(u);
          draw = storyDraw(u);
          k.leave = 0;
          k.draw = draw;
          /* THE MARK IS OFF THE PAGE BEFORE THE DRAWING IS ON IT.
           *
           * It used to fade on the drawing's own progress, so for a moment
           * a bar was up while the rosette was still going — faint, but
           * both there, which is the mixing. The drawing starts at 0.24 of
           * the telling; the mark is gone by 0.23. There is a breath of
           * empty frame between them, and that breath is the point: the
           * room is made, the mark leaves, then the drawing begins. */
          k.markAt = 1 - clamp01((u - 0.12) / 0.11);
        } else if (!vis) continue;

        // ask for the next picture of THIS hole
        /* A drawing is asked for only while it is still ARRIVING. Once it is
         * whole it does not change, so there is nothing to ask for; the
         * departure is done to the composite. This is what makes the hold —
         * most of every cycle — cost nothing at all. */
        const size = k.story ? k.full() : k;
        // the arrival and the departure are both asked for, and a picture
        // is identified by where BOTH sweeps have got to
        /* THE DRAWING IS MADE AT EVERY STAGE OF BEING MADE, again.
         *
         * I took this out on a measurement I had read wrong. The three
         * milliseconds a rasterisation was said to cost is WALL TIME from
         * setting the source to the image loading — queueing included — not
         * time held on the main thread, and the two are not the same number
         * at all. Measured properly, with one in flight and every picture
         * unique: a chart sustains two thousand rasterisations a second and
         * a world choropleth nine hundred, with the frame rate untouched.
         *
         * Thirty stages a second is one and a half per cent of that. What
         * had actually been costing frames was doing it for several pages
         * at once, unbounded — which the limit below now prevents.
         *
         * So the gesture is the drawing's own again, at every stage: a bar
         * grows out of its baseline, a line is traced to its head, a dot
         * swells, an arc leaves its hub. Not a clip that resembles it. */
        const STEPS = 34;
        const want = k.story ? Math.round(draw * STEPS) : STEPS;
        if (
          ask && size && size.w >= 8 && size.h >= 8 && draw > 0 &&
          want !== k.asked && rasterBusy < RASTER_LIMIT
        ) {
          k.asked = want;
          rasterBusy++;
          k.seq = (k.seq || 0) + 1;
          const seq = k.seq;
          /* LAID OUT AT THE HOLE'S OWN SIZE. It used to be capped at two
           * hundred and forty and then stretched into a block up to two
           * hundred and ninety-two wide, which is a fifth bigger than it was
           * composed at — so a title set at ten and a half point arrived on
           * the paper at nearly thirteen, and every rule and every mark came
           * up with it. The graphic did not look wrong on its own; it looked
           * ENLARGED, because next to nine-point body type it was.
           *
           * There is no need for the cap now that the SVG carries a viewBox:
           * the layout is the hole and the pixels are twice it, so the
           * resolution comes from the raster and the SIZE comes from the
           * page, which is where it belongs. */
          const rw = size.w,
            rh = size.h;
          k.pending = true;
          rasterise(
            k.kind, rw, rh, draw, 0, k.vals || liveNow, k.tone, null, k.seed,
          )
            .then((im) => {
              rasterBusy--;
              // a stage that lands after a newer one has been shown is a
              // picture of a moment that has passed
              if (im && seq > (k.shown || 0)) {
                k.shown = seq;
                k.img = im;
                k.fresh = true;
              }
            });
        }
        if (draw <= 0) {
          k.img = null;
          k.asked = -1;
        }

        /* Repainted only when the picture would actually differ. A story
         * page holds still for half of every telling, and setting the same
         * type again for those seconds is a cost with nothing to show. */
        // what of the reel this hole is about to change, in page units
        let wx = k.x,
          wy = k.y,
          ww = k.w,
          wh = k.h;
        if (k.story) {
          if (t - (k.lastPaint || -9) < 1 / PAINT_HZ) continue;
          // while the word is on the page it is moving, so the page is
          // repainted whether or not anything else has changed
          /* THE MARK IS GONE BEFORE THE DRAWING IS THERE. It used to fade
           * from the moment the first stage landed, which is the moment the
           * drawing starts appearing — so the two overlapped and mixed. It
           * runs on the DRAWING'S OWN PROGRESS now: by the time the graphic
           * is a tenth made, the mark has already gone, and a tenth of a
           * bar chart is a few pixels at the foot of the plot. No mixing,
           * because they are never both there. */
          const waiting = k.markAt > 0;
          const dOpen = Math.abs(
            open - (k.lastOpen === undefined ? -9 : k.lastOpen),
          );
          if (
            !waiting &&
            dOpen < 0.0015 &&
            Math.abs(draw - (k.lastDraw === undefined ? -9 : k.lastDraw)) < 0.004 &&
            Math.abs(k.leave - (k.lastGone === undefined ? -9 : k.lastGone)) < 0.004 &&
            !k.fresh
          )
            continue;
          /* ONLY WHAT MOVED IS SET AGAIN, AND ONLY IT IS SENT.
           *
           * The type on a story page is a function of `open` and of nothing
           * else. While the room is being made, the whole band changes and
           * the whole band goes to the card. Once the room IS made — which
           * is most of every telling — `open` holds at one and the only
           * thing still changing is the drawing inside the hole. Setting a
           * page of type again for that, and sending a page-sized rectangle
           * of it, is the same picture typeset and uploaded sixty times a
           * second for nothing.
           *
           * It was affordable while the reel was stored at the size it was
           * drawn at. At two device texels to the unit it is four times the
           * bytes, and four times nothing is still too much. */
          const moved = dOpen > 0.0015 || k.lastOpen === undefined;
          k.lastOpen = open;
          k.lastDraw = draw;
          k.lastGone = k.leave;
          k.lastPaint = t;
          k.fresh = false;
          if (moved) {
            g2.save();
            g2.beginPath();
            g2.rect(k.x, k.y, k.w, k.h);
            g2.clip();
            g2.fillStyle = "#ffffff";
            g2.fillRect(k.x, k.y, k.w, k.h);
            g2.textBaseline = "alphabetic";
            k.paint(open);
          }
          /* THE ARRIVAL, AS A CLIP. Two shapes, and each is the direction
           * its drawing is read in: a ring is swept round from twelve
           * o'clock, everything else is opened from the left, which is how
           * a series runs and how a map is scanned. The edge is hard on
           * purpose — a soft one reads as a fade, and a fade says nothing.
           */
          const inner = k.inner();
          /* THE HOLE ALONE, when the page around it has not moved. Exactly
           * the hole and no margin: the rule drawn round it sits one unit
           * outside, and a padded clear would take it off. */
          if (!moved) {
            if (!inner) continue;
            wx = inner.x;
            wy = inner.y;
            ww = inner.w;
            wh = inner.h;
            g2.save();
            g2.beginPath();
            g2.rect(wx, wy, ww, wh);
            g2.clip();
            g2.fillStyle = "#ffffff";
            g2.fillRect(wx, wy, ww, wh);
          }
          if (inner && k.img && draw > 0) {
            /* Straight down. The picture already IS the drawing at this
             * stage of being made, so there is nothing left to hide. */
            g2.drawImage(k.img, inner.x, inner.y, inner.w, inner.h);
          }
          /* THE WORD DOES NOT JUST STOP. The first stage of a drawing lands
           * in one frame, and swapping a label for a graphic in one frame
           * reads as a glitch — the eye registers the change before it
           * registers what changed. It is held over the drawing and taken
           * off across a third of a second, which is long enough to be a
           * handover and short enough not to be a wait. */
          if (inner && inner.h > 34 && inner.w > 70 && k.markAt > 0)
            mark(g2, inner, t, k.markAt);
          g2.restore();
        } else {
          if (!k.fresh || !k.img) continue;
          k.fresh = false;
          g2.fillStyle = "#ffffff";
          g2.fillRect(k.x, k.y, k.w, k.h);
          g2.drawImage(k.img, k.x, k.y, k.w, k.h);
        }

        putGalley(wx, wy, ww, wh);
        wrote = true;
      }
      /* NO MIPMAP. It used to be rebuilt on every frame a hole wrote, which
       * on a sheet this size is tens of milliseconds of nothing anyone can
       * see: the webs MAGNIFY the reel — that is the whole reason it is
       * stored at twice the size — so the minified levels were built every
       * frame and sampled by nothing. */
      if (!wrote) return;
    }

    const PRESS_IMG = new Map();
    function loadPressImages(done) {
      const urls = [
        ...new Set(
          ARTICLES.map((a) => a.img)
            .concat(LANDMARKS.map((k) => k.img))
            .concat(Object.values(PRESS_ASSETS).flat())
            .filter(Boolean),
        ),
      ];
      let left = urls.length;
      if (!left) return;
      for (const u of urls) {
        const im = new Image();
        // Only what is actually fetched over the network needs it — and on a
        // file:// URL it does not merely do nothing, it fails the check and
        // the image never loads.
        if (/^https?:/i.test(u)) im.crossOrigin = "anonymous";
        im.onload = () => {
          PRESS_IMG.set(u, im);
          if (!--left) done();
        };
        im.onerror = () => {
          if (!--left) done();
        };
        im.src = u;
      }
    }

    /* The five presses, bound to one drawing context. Bound rather than free
     * because the galley is composed twice: once onto a scratch canvas to find
     * out how tall each paper wants to be, and once for real. Each press
     * returns the height it used. */
    function galleyPresses(g) {
      const SERIF = '"Times New Roman", Times, Georgia, serif';
      const R = Math.round;

      const fit = (text, weight, start, max) => {
        let s = start;
        for (;;) {
          g.font = weight + " " + R(s) + "px " + SERIF;
          if (g.measureText(text).width <= max || s < 7) return R(s);
          s *= 0.94;
        }
      };
      /* LETTERSPACING, which every masthead, crosshead and caption here
       * needs and which a canvas has no `tracking` for.
       *
       * Two ways, and the fallback is the one to distrust. Drawing a string
       * glyph by glyph at advances taken from measureText(c) is wrong twice
       * over: measureText(" ") returns ZERO, because a lone space is collapsed
       * before it is measured, so word spaces close up and a title reads SHOOK
       * THEWORLD; and a narrow letter measured ALONE does not carry the
       * advance it has inside a run, so SPIRITUAL came out SP IR ITUAL. The
       * context's own `letterSpacing` has neither problem, so it is used
       * wherever it exists, and the glyph loop is kept only for a context that
       * does not have it — where a slightly uneven masthead beats none.
       *
       * It is set after the font and put back to ZERO before returning —
       * never to a captured value, which is what leaked it into the body. */
      const HAS_LS = "letterSpacing" in g;
      const spaceW = () =>
        g.measureText("i i").width - g.measureText("ii").width;
      const trackWidth = (text, sp) => {
        if (HAS_LS) {
          g.letterSpacing = sp.toFixed(2) + "px";
          const w = g.measureText(text).width - sp; // the last glyph's trail
          g.letterSpacing = "0px";
          return w;
        }
        const sw = spaceW();
        let w = -sp;
        for (const c of [...text])
          w += (c === " " ? sw : g.measureText(c).width) + sp;
        return w;
      };
      const trackDraw = (text, x, y, sp) => {
        const al = g.textAlign;
        g.textAlign = "left";
        if (HAS_LS) {
          g.letterSpacing = sp.toFixed(2) + "px";
          g.fillText(text, x, y);
          // back to ZERO, not to whatever was read out of the context before.
          // Restoring the captured value left every body paragraph after a
          // masthead letterspaced — the getter does not hand back "0px" on a
          // context that has never been set, so the restore was a no-op and
          // the tracking leaked into the whole article.
          g.letterSpacing = "0px";
        } else {
          const sw = spaceW();
          let cx = x;
          for (const c of [...text]) {
            if (c !== " ") g.fillText(c, cx, y);
            cx += (c === " " ? sw : g.measureText(c).width) + sp;
          }
        }
        g.textAlign = al;
      };
      const track = (text, cx, y, sp) =>
        trackDraw(text, cx - trackWidth(text, sp) / 2, y, sp);
      const rule = (x, y, w, h) => g.fillRect(R(x), R(y), R(w), R(h));
      const diamond = (cx, cy, r) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(Math.PI / 4);
        g.fillRect(-r, -r, r * 2, r * 2);
        g.restore();
      };
      // two hairlines with a lozenge between them — a monthly's mark, where a
      // paper would put a rule
      const lozenge = (cx, y, w) => {
        rule(cx - w, y, w - 7, 1);
        rule(cx + 7, y, w - 7, 1);
        diamond(cx, y + 0.5, 2.1);
      };

      /* A plate's box takes the PICTURE's shape.
       *
       * It used to be a height chosen per press — 78 rows for a monthly, 64
       * for a rail — with the photograph cover-fitted into it. Two of the six
       * are PORTRAITS: Bandit's Roost and the Doré both run 960 by 1186, a
       * ratio of 0.81, and cover-fitting a portrait into a box five times
       * wider than it is tall throws away nineteen twentieths of the plate.
       * What was left read as a stretched strip, which is what it was. Taken
       * from the image instead, the box IS the picture's rectangle — bounded
       * by the measure and by a height the page can afford — and nothing is
       * cropped at all. */
      const plateBox = (x, y, maxW, maxH, img) => {
        const r = img && img.width ? img.width / img.height : 1.6;
        let w = maxW,
          h = w / r;
        if (h > maxH) {
          h = maxH;
          w = h * r;
        }
        return { x: x + (maxW - w) / 2, y, w, h };
      };

      /* A cut. A real photograph when one has arrived, held back to what
       * newsprint could actually hold: no black, no white, and no colour —
       * a rotary press in 1890 had one ink. When none has arrived it is the
       * drawn plate, which is a lit ground with a subject standing in it
       * rather than a halftone, because at a galley's size a halftone is a
       * grey rectangle and a hard-edged subject is a censor's bar. */
      const cut = (x, y, w, h, caption, img, style) => {
        if (img && img.width) {
          const s = Math.max(w / img.width, h / img.height);
          const dw = img.width * s,
            dh = img.height * s;
          g.save();
          g.beginPath();
          g.rect(R(x), R(y), R(w), R(h));
          g.clip();
          g.drawImage(img, R(x + (w - dw) / 2), R(y + (h - dh) / 2), R(dw), R(dh));
          // one ink: the saturation of a grey fill, over the photograph's own
          // hue and luminosity
          g.globalCompositeOperation = "saturation";
          g.fillStyle = "#808080";
          g.fillRect(R(x), R(y), R(w), R(h));
          g.globalCompositeOperation = "source-over";
          // and off both ends of the range, the way ink on absorbent paper is
          g.fillStyle = "rgba(244,241,234,.17)";
          g.fillRect(R(x), R(y), R(w), R(h));
          g.restore();
        } else {
          const grd = g.createLinearGradient(x, y, x + w * 0.5, y + h);
          grd.addColorStop(0.0, "#b4b0a8");
          grd.addColorStop(0.5, "#6e6a64");
          grd.addColorStop(1.0, "#948f87");
          g.fillStyle = grd;
          g.fillRect(R(x), R(y), R(w), R(h));
          const sub = g.createRadialGradient(
            x + w * 0.38,
            y + h * 0.52,
            h * 0.04,
            x + w * 0.38,
            y + h * 0.52,
            h * 0.52,
          );
          sub.addColorStop(0.0, "rgba(232,229,222,.8)");
          sub.addColorStop(1.0, "rgba(232,229,222,0)");
          g.fillStyle = sub;
          g.fillRect(R(x), R(y), R(w), R(h));
        }
        g.fillStyle = "#111111";
        let yy = y + h + 3;
        if (caption) {
          g.fillRect(R(x), R(yy), R(w), 1);
          yy += 10;
          /* A monthly centres its caption and tracks it; a paper ranges it
           * left under the cut and leaves it at that. Both are period, and
           * which one is used is one more thing that tells the two apart at a
           * glance — which is the whole job of these templates. */
          const mid = style === "centre";
          const fsz = mid ? 6.5 : 7;
          const sp = mid ? fsz * 0.16 : 0;
          g.font = fsz + "px " + SERIF;
          g.textAlign = "left";
          const txt = mid ? caption.toUpperCase() : caption;
          const wid = (ws) =>
            mid
              ? trackWidth(ws.join(" "), sp)
              : g.measureText(ws.join(" ")).width;
          const put = (ws) => {
            if (mid) trackDraw(ws.join(" "), x + (w - wid(ws)) / 2, yy, sp);
            else g.fillText(ws.join(" "), x, yy);
            yy += mid ? 10 : 9;
          };
          let line = [];
          for (const t of txt.split(/\s+/)) {
            line.push(t);
            if (wid(line) > w) {
              line.pop();
              put(line);
              line = [t];
            }
          }
          if (line.length) put(line);
        }
        return yy;
      };

/* The body of a page.
 *
 * TWO THINGS CHANGED HERE, and they are the same thing seen twice.
 *
 * A page is a PAGE. Its depth comes from the sheet the press printed on
 * — a fixed format per press — and never from how much of the article
 * happened to be set. Before this, a slot stopped where the text
 * stopped, so the eleven pages were eleven different heights with no
 * reason behind any of them, and a short piece produced a stub.
 *
 * And a page is FULL. No newspaper has ever left the foot of a column
 * empty: when a story runs out, the next one starts under a rule. So the
 * flow is handed the articles that follow this one in its own column's
 * order, and it keeps taking them — a rule, the paper's own headline,
 * its byline, its text — until every column is full to the last line.
 *
 * The columns are balanced: every line is a slot, a crosshead is two, a
 * continuation head is four, and the plate blocks as many as it is deep
 * in the column it sits in.
 */
const flowCol = (A, o) => {
  const { left, meas, top, bot, fs, lh, cols, drop, plate, openCaps, fill } = o;
  const gut = cols > 1 ? 9 : 0;
  const colW = (meas - gut * (cols - 1)) / cols;
  const bodyFont = fs + "px " + SERIF;
  const capsFont = R(fs * 0.92) + "px " + SERIF;
  const DROPN = 3;

  // the page's own depth, in lines, and what the columns must hold
  const depth = Math.max(4, Math.floor((bot - top) / lh));
  const blocked = plate ? Math.ceil(plate.h / lh) + 1 : 0;
  const want = depth * cols - blocked;

  let dropCh = "",
    dropW = 0,
    dropSize = 0;
  if (drop) {
    const b0 = A.body.find((b) => !b.h);
    dropCh = b0 ? b0.t.charAt(0) : "";
    /* The cap spans the first line's own cap-height down to the third
     * line's baseline. Times' capital is about seven tenths of its body,
     * so that span over seven tenths IS the size. */
    dropSize = R((lh * (DROPN - 1) + fs * 0.7) / 0.7);
    g.font = "700 " + dropSize + "px " + SERIF;
    dropW = g.measureText(dropCh).width + fs * 0.24;
  }

  const lines = [];
  let slots = 0;
  const add = (L, n) => {
    lines.push(L);
    slots += n;
  };

  // one article's worth of lines, poured in
  const pour = (art, isFirst) => {
    let firstPara = true,
      started = false,
      capsLeft = isFirst ? openCaps || 0 : 0;
    for (const blk of art.body) {
      if (slots >= want) return;
      if (blk.h) {
        if (started) add({ head: true, text: blk.t }, 2);
        continue;
      }
      started = true;
      let ws = blk.t.split(/\s+/).filter(Boolean);
      if (isFirst && firstPara && drop && ws.length)
        ws = [ws[0].slice(1)].concat(ws.slice(1)).filter(Boolean);
      const toks = ws.map((t) => {
        if (firstPara && capsLeft > 0) {
          capsLeft--;
          return { t: t.toUpperCase(), caps: true };
        }
        return { t, caps: false };
      });
      let i = 0,
        first = true;
      while (i < toks.length && slots < want) {
        const di = isFirst && drop && lines.length < DROPN ? dropW : 0;
        const indent =
          (first && !(isFirst && drop && firstPara) ? fs * 1.05 : 0) + di;
        const line = [];
        let w = indent;
        while (i < toks.length) {
          g.font = toks[i].caps ? capsFont : bodyFont;
          const adv = g.measureText((line.length ? " " : "") + toks[i].t).width;
          if (w + adv > colW && line.length) break;
          line.push(toks[i]);
          w += adv;
          i++;
        }
        add({ toks: line, indent, justify: i < toks.length }, 1);
        first = false;
      }
      firstPara = false;
    }
  };

  pour(A, true);
  for (const nxt of fill || []) {
    if (slots >= want) break;
    add({ brk: true, text: nxt.head.join(" "), by: nxt.by }, 4);
    pour(nxt, false);
  }

  let li = 0;
  for (let c = 0; c < cols && li < lines.length; c++) {
    const x0 = left + c * (colW + gut);
    let ly = top,
      used = 0;
    const from = li;
    while (used < depth && li < lines.length) {
      if (
        plate &&
        x0 + colW > plate.x + 1 &&
        x0 < plate.x + plate.w - 1 &&
        ly > plate.y &&
        ly - fs < plate.y + plate.h
      ) {
        ly += lh;
        used++;
        continue;
      }
      const L = lines[li++];

      // the next story on the page: a rule, its headline, its byline
      if (L.brk) {
        if (used + 4 > depth) {
          li--;
          break;
        }
        g.fillRect(R(x0), R(ly - fs * 0.4), R(colW), 2);
        ly += lh * 0.9;
        let ts = R(fs * 1.24);
        for (;;) {
          g.font = "700 " + ts + "px " + SERIF;
          if (g.measureText(L.text).width <= colW || ts < 6) break;
          ts -= 0.5;
        }
        g.textAlign = "center";
        g.fillText(L.text, x0 + colW / 2, ly);
        ly += lh;
        g.font = R(fs * 0.8) + "px " + SERIF;
        track(L.by, x0 + colW / 2, ly, fs * 0.24);
        g.textAlign = "left";
        ly += lh * 1.1;
        used += 4;
        continue;
      }

      if (L.head) {
        const ts = R(fs * 0.88);
        g.font = ts + "px " + SERIF;
        track(L.text.toUpperCase(), x0 + colW / 2, ly + fs * 0.2, ts * 0.18);
        ly += lh * 1.6;
        used += 2;
        continue;
      }

      const wd = L.toks.map((t) => {
        g.font = t.caps ? capsFont : bodyFont;
        return g.measureText(t.t).width;
      });
      g.font = bodyFont;
      const spaceW = g.measureText("i i").width - g.measureText("ii").width;
      const sum = wd.reduce((a, b) => a + b, 0);
      const gap =
        L.justify && L.toks.length > 1
          ? (colW - L.indent - sum) / (L.toks.length - 1)
          : spaceW;
      let cx = x0 + L.indent;
      for (let k = 0; k < L.toks.length; k++) {
        g.font = L.toks[k].caps ? capsFont : bodyFont;
        g.fillText(L.toks[k].t, cx, ly);
        cx += wd[k] + gap;
      }
      ly += lh;
      used++;
    }
    if (c > 0 && li > from)
      g.fillRect(R(x0 - gut / 2), R(top - fs), 1, R(depth * lh - lh * 0.4));
  }
  if (drop && dropCh) {
    g.font = "700 " + dropSize + "px " + SERIF;
    g.textAlign = "left";
    g.fillText(dropCh, left, top + lh * (DROPN - 1));
  }
  return top + depth * lh;
};

      /* A PLACEHOLDER, and it says which KIND it stands in for. A black
       * rectangle would do for a photograph and would say nothing at all for a
       * chart or a map, and the whole point of these thirty pages is to judge
       * where each kind of thing sits — so a chart placeholder has bars, a map
       * has a coast and some marks on it, and a photograph is a plate with a
       * subject in it. None of them is data; all of them are shapes. */
      const PALETTE = ["#1a2ffb", "#f2b13c", "#b3402a", "#1a7a4a", "#6b4ea8"];
      const placeholder = (kind, x, y, w, h, tint, rich, seed, mono) => {
        if (w <= 2 || h <= 2) return;
        g.save();
        g.beginPath();
        g.rect(R(x), R(y), R(w), R(h));
        g.clip();

        /* THE REAL ONE, IF IT ARRIVED. The galley is composed twice — once
         * before the files are in, once after — so this is the only place
         * that decides between a captured graphic and the shape that stands
         * in for it while the page is still loading.
         *
         * Cropped to fill rather than fitted, because a hole in a page has
         * the proportion the layout gave it and a letterboxed chart in a
         * newspaper column reads as a mistake. Rung two desaturates: that
         * press had one ink, and the whole ramp says so. */
        const list = PRESS_ASSETS[kind];
        const real =
          list && list.length && PRESS_IMG.get(list[(seed || 0) % list.length]);
        if (real) {
          const br = w / h;
          let sw = real.width,
            sh = real.height,
            sx = 0,
            sy = 0;
          if (sw / sh > br) {
            sw = sh * br;
            sx = (real.width - sw) / 2;
          } else {
            sh = sw / br;
            sy = (real.height - sh) / 2;
          }
          g.drawImage(real, sx, sy, sw, sh, R(x), R(y), R(w), R(h));
          if (mono) {
            g.globalCompositeOperation = "saturation";
            g.fillStyle = "#808080";
            g.fillRect(R(x), R(y), R(w), R(h));
            g.globalCompositeOperation = "source-over";
          }
          g.strokeStyle = "rgba(20,20,28,.28)";
          g.lineWidth = 1;
          g.strokeRect(R(x) + 0.5, R(y) + 0.5, R(w) - 1, R(h) - 1);
          g.restore();
          return;
        }
        if (kind === "photo") {
          g.fillStyle = tint || "#5c5a55";
          g.fillRect(R(x), R(y), R(w), R(h));
          g.fillStyle = "rgba(255,255,255,.22)";
          g.beginPath();
          g.ellipse(x + w * 0.36, y + h * 0.56, w * 0.16, h * 0.34, 0, 0, 7);
          g.fill();
          g.fillStyle = "rgba(20,20,28,.28)";
          g.fillRect(R(x), R(y + h * 0.72), R(w), R(h * 0.28));
        } else if (kind === "chart") {
          g.fillStyle = "rgba(20,20,28,.055)";
          g.fillRect(R(x), R(y), R(w), R(h));
          const n = Math.max(5, Math.round(w / 16));
          const bw = (w * 0.86) / n;
          for (let i = 0; i < n; i++) {
            const v = 0.28 + 0.66 * Math.abs(Math.sin(i * 1.7 + w));
            g.fillStyle = rich
              ? PALETTE[i % PALETTE.length]
              : tint && i === Math.floor(n * 0.62)
                ? tint
                : "#3a3833";
            g.fillRect(
              R(x + w * 0.07 + i * bw),
              R(y + h * 0.82 - v * h * 0.66),
              R(bw * 0.62),
              R(v * h * 0.66),
            );
          }
          g.fillStyle = "rgba(20,20,28,.42)";
          g.fillRect(R(x + w * 0.07), R(y + h * 0.82), R(w * 0.86), 1);
        } else {
          g.fillStyle = "rgba(20,20,28,.055)";
          g.fillRect(R(x), R(y), R(w), R(h));
          g.strokeStyle = rich ? "#5b5852" : "#3a3833";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + w * 0.12, y + h * 0.68);
          g.bezierCurveTo(
            x + w * 0.26, y + h * 0.22,
            x + w * 0.62, y + h * 0.86,
            x + w * 0.9, y + h * 0.3,
          );
          g.stroke();
          g.beginPath();
          g.moveTo(x + w * 0.2, y + h * 0.26);
          g.bezierCurveTo(
            x + w * 0.44, y + h * 0.52,
            x + w * 0.5, y + h * 0.2,
            x + w * 0.84, y + h * 0.62,
          );
          g.stroke();
          for (let i = 0; i < (rich ? 9 : 6); i++) {
            g.fillStyle = rich
              ? PALETTE[i % PALETTE.length]
              : tint && i % 3 === 0
                ? tint
                : "#3a3833";
            g.beginPath();
            g.arc(
              x + w * (0.16 + 0.085 * i),
              y + h * (0.4 + 0.26 * Math.sin(i * 2.1)),
              Math.max(1.6, w * (rich ? 0.018 : 0.012)),
              0,
              7,
            );
            g.fill();
          }
        }
        g.restore();
        g.fillStyle = "rgba(20,20,28,.2)";
        g.strokeStyle = "rgba(20,20,28,.2)";
        g.strokeRect(R(x) + 0.5, R(y) + 0.5, R(w) - 1, R(h) - 1);
        g.fillStyle = "#111111";
      };

      const imgOf = (A) => (A.img ? PRESS_IMG.get(A.img) : null);
      const wrapTo = (text, w, font) => {
        g.font = font;
        const out = [];
        let line = [];
        for (const t of text.split(/\s+/)) {
          line.push(t);
          if (g.measureText(line.join(" ")).width > w) {
            line.pop();
            if (line.length) out.push(line.join(" "));
            line = [t];
          }
        }
        if (line.length) out.push(line.join(" "));
        return out;
      };

      return {
        // one name across the top under a double rule, a centred headline, and
        // a plate across the measure a few lines in
        broadsheet(A, x0, top, capH, fill) {
          const M = 14,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          let y = top + 14;
          rule(left, y, meas, 3);
          y += 6;
          rule(left, y, meas, 1);
          y += 22;
          g.textAlign = "center";
          const ms = fit(A.paper, "700", 23, meas * 0.9);
          g.font = "700 " + ms + "px " + SERIF;
          g.fillText(A.paper, mid, y);
          y += 8;
          rule(left, y, meas, 1);
          y += 12;
          g.font = "8px " + SERIF;
          g.textAlign = "left";
          g.fillText(A.date, left, y);
          g.textAlign = "right";
          g.fillText(A.by, left + meas, y);
          y += 6;
          rule(left, y, meas, 1);
          y += 24;
          g.textAlign = "center";
          let hs = 25;
          for (const l of A.head) hs = Math.min(hs, fit(l, "700", 25, meas));
          g.font = "700 " + hs + "px " + SERIF;
          for (const l of A.head) {
            g.fillText(l, mid, y);
            y += R(hs * 1.08);
          }
          y += 3;
          const ss = fit(A.sub, "400", 10, meas * 0.95);
          g.font = ss + "px " + SERIF;
          g.fillText(A.sub, mid, y);
          y += 9;
          rule(mid - meas * 0.16, y, meas * 0.32, 1);
          y += 18;
          g.textAlign = "left";
          const fs = 9.5,
            lh = 12.6;
          /* The cut OPENS the body; it does not interrupt it. Dropped four
           * lines in, on a single column, it fell in the middle of a sentence
           * — the reader got half a clause, a photograph, and then the other
           * half. Above the first line it costs nothing and reads as a plate. */
          if (A.cut) {
            const b = plateBox(left, y, meas, 178, imgOf(A));
            y = cut(b.x, b.y, b.w, b.h, A.cap, imgOf(A)) + 9;
          }
          const plate = null;
          return (
            flowCol(A, {
              left,
              meas,
              top: y + fs,
              bot: top + capH - 14,
              fs,
              lh,
              cols: 1,
              fill,
              plate,
            }) + 12
          );
        },

        // the name reversed out of a black band, one line of type as big as it
        // will go ranged left, a cut across the measure, and a black foot
        tabloid(A, x0, top, capH, fill) {
          const M = 12,
            meas = GALLEY_COL - M * 2,
            left = x0 + M;
          const band = 42;
          g.fillStyle = "#111111";
          g.fillRect(R(x0), R(top), GALLEY_COL, band);
          g.fillStyle = "#ffffff";
          g.textAlign = "center";
          const name = A.paper.toUpperCase();
          const ms = fit(name, "700", 30, meas * 0.96);
          g.font = "700 " + ms + "px " + SERIF;
          g.fillText(name, x0 + GALLEY_COL / 2, top + R(band * 0.72));
          g.fillStyle = "#111111";
          /* The air. The dateline sat six rows above a two-point rule, so its
           * descenders touched it, and the headline's baseline was thirty rows
           * under that rule — which at forty point puts the tops of the caps
           * ON it. Both gaps are opened, and the one over the headline is
           * measured from the size the headline actually came out at rather
           * than being a number that happened to work at one size. */
          let y = top + band + 18;
          g.font = "8px " + SERIF;
          g.textAlign = "left";
          g.fillText(A.date, left, y);
          g.textAlign = "right";
          g.fillText(A.by, left + meas, y);
          y += 11;
          rule(left, y, meas, 2);
          g.textAlign = "left";
          let hs = 40;
          for (const l of A.head) hs = Math.min(hs, fit(l, "700", 40, meas));
          y += R(hs * 0.74) + 20;
          g.font = "700 " + hs + "px " + SERIF;
          for (const l of A.head) {
            g.fillText(l, left, y);
            y += R(hs * 0.92);
          }
          y += 12;
          const ss = fit(A.sub, "400", 10.5, meas);
          g.font = ss + "px " + SERIF;
          g.fillText(A.sub, left, y);
          y += 18;
          if (A.cut) {
            const b = plateBox(left, y, meas, 190, imgOf(A));
            y = cut(b.x, b.y, b.w, b.h, A.cap, imgOf(A)) + 5;
          }
          const end = flowCol(A, {
            left,
            meas,
            top: y + 9,
            bot: top + capH - 26,
            fs: 8.6,
            lh: 11.6,
            cols: 2,
            fill,
          });
          g.fillStyle = "#111111";
          g.fillRect(R(x0), R(end + 8), GALLEY_COL, 7);
          return end + 22;
        },

        /* THE ATLANTIC MONTHLY. The austere one: no illustration, one column,
         * everything centred, and the whole page carried by air and by the
         * decorated initial. The Atlantic did not illustrate its essays, so
         * this template has no plate at all — which is the point of it. */
        monthly(A, x0, top, capH, fill) {
          const M = 40,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          g.textAlign = "center";
          let y = top + 34;
          const nm = A.paper.toUpperCase();
          const ms = fit(nm, "400", 9.5, meas * 0.78);
          g.font = ms + "px " + SERIF;
          track(nm, mid, y, ms * 0.46);
          y += 15;
          lozenge(mid, y, meas * 0.3);
          y += 42;
          let hs = 25;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "400", 25, meas * 0.86));
          g.font = "400 " + hs + "px " + SERIF;
          for (const l of A.head) {
            track(l, mid, y, hs * 0.045);
            y += R(hs * 1.2);
          }
          y += 6;
          const ss = fit(A.sub, "italic 400", 9.5, meas * 0.9);
          g.font = "italic 400 " + ss + "px " + SERIF;
          g.fillText(A.sub, mid, y);
          y += 20;
          g.font = "7.5px " + SERIF;
          track(A.by, mid, y, 7.5 * 0.62);
          y += 30;
          g.textAlign = "left";
          const end = flowCol(A, {
            left, meas, top: y, bot: top + capH - 26,
            fs: 9.5, lh: 14.4, cols: 1, drop: true, fill,
            openCaps: 4,
          });
          diamond(mid, end + 9, 2.4);
          return end + 26;
        },

        /* SCRIBNER'S. The illustrated monthly, and it does not look like the
         * Atlantic: the essay is set in TWO columns, the title sits between
         * two rules rather than under an ornament, and there is a plate. Three
         * magazines composed by one template were three magazines a reader
         * could not tell apart, which is the thing this fixes. */
        illustrated(A, x0, top, capH, fill) {
          const M = 22,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          g.textAlign = "center";
          let y = top + 26;
          const nm = A.paper.toUpperCase();
          const ms = fit(nm, "400", 9, meas * 0.6);
          g.font = ms + "px " + SERIF;
          track(nm, mid, y, ms * 0.5);
          y += 14;
          rule(left, y, meas, 1);
          y += 34;
          let hs = 23;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "400", 23, meas * 0.8));
          g.font = "400 " + hs + "px " + SERIF;
          for (const l of A.head) {
            track(l, mid, y, hs * 0.05);
            y += R(hs * 1.16);
          }
          y += 11;
          rule(mid - meas * 0.14, y, meas * 0.28, 1);
          y += 21;
          const ss = fit(A.sub, "italic 400", 9, meas * 0.86);
          g.font = "italic 400 " + ss + "px " + SERIF;
          g.fillText(A.sub, mid, y);
          y += 17;
          g.font = "7.5px " + SERIF;
          track(A.by, mid, y, 7.5 * 0.6);
          y += 22;
          g.textAlign = "left";
          const fs = 8.6,
            lh = 12.2;
          /* On a two-column page the cut takes ONE column, not the measure.
           * Centred across both — which is what plateBox does when it is
           * handed the whole measure and a portrait to fit — it punched a hole
           * through the middle of both columns and dropped its caption over
           * the type on either side of it. */
          /* The cut heads the SECOND column. In the measure it holed both
           * columns and dropped its caption over the type either side; four
           * lines down the first column it cut the opening sentence in two.
           * At the head of column two it interrupts nothing: column one runs
           * clean from its initial, column two starts under the picture. */
          const colW = (meas - 9) / 2;
          /* Its top sits on the first line's cap-height, not on that line's
           * baseline: level with the baseline, one line of text still fits
           * ABOVE the picture — correctly, since that line's body is clear of
           * it — and the column then opened on a single stranded line. */
          const plate = A.cut
            ? plateBox(left + colW + 9, y - fs, colW, 214, imgOf(A))
            : null;
          if (plate)
            plate.h =
              cut(plate.x, plate.y, plate.w, plate.h, A.cap, imgOf(A), "centre") -
              plate.y;
          const end = flowCol(A, {
            left, meas, top: y, bot: top + capH - 24,
            fs, lh, cols: 2, drop: true, plate, fill,
            openCaps: 3,
          });
          diamond(mid, end + 9, 2.2);
          return end + 24;
        },

        /* A SLOT NOT YET FILLED. Everything on rungs three to five was written
         * by me from nothing — invented decade labels over invented paragraphs
         * — so it is taken out and the hole it leaves is drawn instead: the
         * rung, the year the reel wants, and what has to go there. The reel
         * runs with gaps in it, which is the honest state of the work.
         *
         * Nothing else in the reel is made up. The eleven papers are real
         * articles and the five plates are real sheets. */
        blank(B, x0, top, capH) {
          const M = 22,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          g.save();
          g.setLineDash([7, 6]);
          g.strokeStyle = "rgba(20,20,28,.32)";
          g.lineWidth = 1;
          g.strokeRect(R(left) + 0.5, R(top + 24) + 0.5, R(meas), R(capH - 52));
          g.restore();
          g.textAlign = "center";
          let y = top + capH * 0.42;
          g.font = "9px " + SERIF;
          track("RUNG " + B.rung, mid, y, 9 * 0.5);
          y += 30;
          let hs = 21;
          for (;;) {
            g.font = "400 " + R(hs) + "px " + SERIF;
            if (g.measureText(B.need).width <= meas * 0.86 || hs < 10) break;
            hs *= 0.94;
          }
          const lines = wrapTo(B.need, meas * 0.86, "400 " + R(hs) + "px " + SERIF);
          for (const l of lines) {
            g.fillText(l, mid, y);
            y += R(hs * 1.18);
          }
          y += 16;
          rule(mid - meas * 0.14, y, meas * 0.28, 1);
          y += 18;
          g.font = "8px " + SERIF;
          track(String(B.year).toUpperCase(), mid, y, 8 * 0.5);
          y += 22;
          g.font = "italic 8.5px " + SERIF;
          g.fillText("to produce", mid, y);
          g.textAlign = "left";
          return top + capH;
        },

        /* THE ONE PAINTER. Every template on the reel comes through here: it
         * reads a spec and draws it, so a spacing fault is fixed in one place
         * rather than in thirty.
         *
         * It also ENFORCES the rungs rather than trusting the specs. Rung one
         * carries no block whatever a spec says, rung two's blocks are one ink
         * however they are marked, and only rung five may let a block take the
         * measure at the top of the page. A constraint a data table can break
         * is not a constraint. */
        spec(S, x0, top, capH) {
          const M = 16,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          const ink = S.rung >= 3 && S.tone ? S.tone : "#111111";
          let y = top + 20;

          // ---- the name
          if (S.head === "band") {
            const band = 34;
            g.fillStyle = "#111111";
            g.fillRect(R(x0), R(top), GALLEY_COL, band);
            g.fillStyle = "#ffffff";
            g.textAlign = "center";
            const ms = fit("THE COLUMN INCH", "700", 24, meas * 0.94);
            g.font = "700 " + ms + "px " + SERIF;
            g.fillText("THE COLUMN INCH", mid, top + R(band * 0.72));
            g.fillStyle = "#111111";
            y = top + band + 18;
          } else if (S.head === "tracked") {
            g.textAlign = "center";
            const ms = fit("THE DEADLINE REVIEW", "400", 9.5, meas * 0.7);
            g.font = ms + "px " + SERIF;
            track("THE DEADLINE REVIEW", mid, y + 8, ms * 0.46);
            y += 18;
            g.fillStyle = ink;
            lozenge(mid, y, meas * 0.26);
            g.fillStyle = "#111111";
            y += 20;
          } else if (S.head === "left") {
            g.textAlign = "left";
            const ms = fit("The Galley Proof", "700", 19, meas * 0.56);
            g.font = "700 " + ms + "px " + SERIF;
            g.fillText("The Galley Proof", left, y + R(ms * 0.74) + 4);
            g.textAlign = "right";
            g.font = "7px " + SERIF;
            g.fillStyle = ink;
            g.fillText("LATE EDITION", left + meas, y + 10);
            g.fillStyle = "#111111";
            y += R(ms * 0.74) + 14;
            rule(left, y, meas, 2);
            y += 16;
          } else if (S.head === "boxed") {
            g.textAlign = "center";
            const ms = fit("THE STONE & THE SPIKE", "700", 15, meas * 0.62);
            const bh = R(ms * 0.74) + 18;
            g.strokeStyle = "#111111";
            g.lineWidth = 1;
            g.strokeRect(R(mid - meas * 0.38) + 0.5, R(y) + 0.5, R(meas * 0.76), bh);
            g.font = "700 " + ms + "px " + SERIF;
            g.fillText("THE STONE & THE SPIKE", mid, y + bh - 9);
            y += bh + 12;
            g.fillStyle = ink;
            rule(left, y, meas, 1);
            g.fillStyle = "#111111";
            y += 14;
          } else if (S.head === "shoulder") {
            g.textAlign = "left";
            const ms = fit("The Press Run", "700", 22, meas * 0.44);
            g.font = "700 " + ms + "px " + SERIF;
            g.fillText("The Press Run", left, y + R(ms * 0.74) + 2);
            const bx = left + meas * 0.58,
              bw = meas * 0.42;
            rule(bx, y + 2, bw, 1);
            rule(bx, y + 20, bw, 1);
            g.textAlign = "right";
            g.font = "6.5px " + SERIF;
            g.fillText("SET IN THE MORNING", left + meas, y + 10);
            g.fillStyle = ink;
            g.fillText("PRINTED BY NOON", left + meas, y + 17);
            g.fillStyle = "#111111";
            y += R(ms * 0.74) + 14;
            rule(left, y, meas, 3);
            y += 15;
          } else {
            g.textAlign = "center";
            const ms = fit("The Daily Splash", "700", 21, meas * 0.82);
            y += R(ms * 0.74) + 6;
            g.font = "700 " + ms + "px " + SERIF;
            g.fillText("The Daily Splash", mid, y);
            y += 11;
            g.fillStyle = ink;
            rule(left, y, meas, 2);
            g.fillStyle = "#111111";
            y += 5;
            rule(left, y, meas, 1);
            y += 14;
            g.font = "7.5px " + SERIF;
            g.textAlign = "left";
            g.fillText("NO. 1, VOL. I", left, y);
            g.textAlign = "right";
            g.fillText("PRICE: ONE INCH", left + meas, y);
            y += 6;
            rule(left, y, meas, 1);
            y += 16;
          }

          // ---- the headline and the deck
          const title = LOREM_HEAD[(S.rung * 7 + (S.i || 0)) % LOREM_HEAD.length];
          g.textAlign = S.head === "left" ? "left" : "center";
          const hs = fit(title, S.head === "tracked" ? "400" : "700", 25, meas * 0.92);
          y += R(hs * 0.74) + 10;
          g.font = (S.head === "tracked" ? "400 " : "700 ") + hs + "px " + SERIF;
          g.fillText(title, S.head === "left" ? left : mid, y);
          y += 14;
          g.font = "italic 9px " + SERIF;
          g.fillText(
            "Made at the desk, from the reporting already done",
            S.head === "left" ? left : mid,
            y,
          );
          y += 8;
          if (S.head !== "left") rule(mid - meas * 0.13, y, meas * 0.26, 1);
          y += 18;

          // ---- the measure, and the blocks that sit in it
          const cols = S.cols,
            gut = 9,
            colW = (meas - gut * (cols - 1)) / cols;
          const fs = cols >= 3 ? 7.6 : 9,
            lh = cols >= 3 ? 10.4 : 12.4;
          const bot = top + capH - (S.bare ? 34 : 14);
          const depth = Math.floor((bot - y) / lh);

          /* THE BODY, AS A FUNCTION OF HOW FAR THE HOLE HAS OPENED.
           *
           * It used to run once, inline. It is a closure now because a story
           * page repaints it — the whole point of that page is that the text
           * OPENS to make room, and text that opens has to be set again with
           * the hole at its new size. The flow already avoided a block by
           * line-slots, so growing the block from nothing is the entire
           * animation: the lines above hold, the lines below are pushed down,
           * and a gap appears between them.
           *
           * `grow` is 0 for the page as printed and 1 for the page with the
           * graphic in it. The block's rectangle at the current size is left
           * on `liveInner`, because that is where the drawing goes. */
          let liveInner = null;
          const body = (grow) => {
            /* The rung, enforced. A spec cannot put a picture on rung one, and
             * cannot give a block the measure at the top of the page below rung
             * five, whatever it says. */
            const blocks = (S.rung === 1 && !S.story ? [] : S.blocks || [])
              .map((b) => ({
                ...b,
                lines: S.story ? Math.round(b.lines * grow) : b.lines,
                span: S.rung < 5 && !S.story && b.span >= cols && b.at === 0 && cols > 1
                  ? Math.max(1, cols - 1)
                  : b.span,
                colour: S.rung >= 3 && b.colour,
              }))
              .filter((b) => b.lines >= 1);

            /* A block takes the line-slots it is given, MINUS the air it owes
             * the type around it. Set flush to its slots it began exactly where
             * the line above it ended — a pixel and a half under that line's
             * descenders — and the picture read as if it were glued to the text.
             * Five rows off the top and eight off the foot leave about the same
             * white above and below, which is what the eye is measuring. */
            const AIR_T = 5,
              AIR_B = 8;
            liveInner = null;
            for (let bi = 0; bi < blocks.length; bi++) {
              const b = blocks[bi];
              const bx = left + b.col * (colW + gut),
                bw = colW * b.span + gut * (b.span - 1),
                by = y - fs + b.at * lh + AIR_T,
                bh = b.lines * lh - AIR_T - AIR_B;
              if (bh < 2) continue;

              /* On a story page the block is not a picture yet. It is the room
               * being made for one: a hairline frame that grows with the text,
               * and the drawing arrives inside it afterwards. Painting a
               * placeholder here would put a finished graphic in a hole that is
               * still opening, which says the opposite of what the page is for. */
              if (S.story) {
                g.save();
                g.strokeStyle = "rgba(20,20,28,.5)";
                g.lineWidth = 1;
                g.strokeRect(R(bx) + 0.5, R(by) + 0.5, R(bw) - 1, R(bh) - 1);
                g.restore();
                liveInner = { x: R(bx) + 1, y: R(by) + 1, w: R(bw) - 2, h: R(bh) - 2 };
                continue;
              }

              /* From the fifth rung up a drawing carries COLOUR — several of
               * them. The rungs under it are a press with one ink, or one that
               * bought a second for a photograph; a chart made at a desk today
               * has a palette, and drawing the top of the ramp in the same grey
               * as rung two says the opposite of what the page is for. The
               * sixth rung is the end of that ramp, not a step back off it. */
              /* A block the page wants alive keeps its rectangle, in galley
               * coordinates, so the frame loop can write that rectangle and
               * nothing else. */
              if (S.live === bi && LIVE_ART[S.anim])
                LIVE_HOLES.push({
                  x: R(bx), y: R(by), w: R(bw), h: R(bh),
                  anim: S.anim, tone: S.tone || "#b3402a",
                });
              placeholder(
                b.kind, bx, by, bw, bh,
                b.colour ? ink : null,
                S.rung >= 5,
                (S.i || 0) * 3 + bi,
                S.rung === 2,
              );
            }

            /* A BARE PAGE STOPS HERE. On the sixth rung the drawing IS the
             * article: there is no body to flow, so the blocks take the page and
             * the only words under them are the ones a graphic cannot do without
             * — where the numbers came from, and who made it. Running the text
             * loop anyway would have set lorem in the gaps between the charts,
             * which is exactly the thing this rung is defined by not having. */
            if (S.bare) {
              const fy = top + capH - 22;
              g.fillStyle = ink;
              g.fillRect(R(left), R(fy), R(meas * 0.14), 2);
              g.fillStyle = "#111111";
              g.font = "7px " + SERIF;
              g.textAlign = "left";
              g.fillText("SOURCE · LOREM IPSUM STATISTICAL OFFICE, 2026", left, fy + 12);
              g.textAlign = "right";
              g.fillText("GRAPHIC BY THE DESK", left + meas, fy + 12);
              g.textAlign = "left";
              return;
            }

            // the words, flowing round them
            g.fillStyle = "#111111";
            g.font = fs + "px " + SERIF;
            g.textAlign = "left";
            const words = LOREM.split(" ");
            let w = 0;
            const line = () => {
              const out = [];
              let acc = 0;
              while (w < words.length) {
                const add = g.measureText((out.length ? " " : "") + words[w]).width;
                if (acc + add > colW && out.length) break;
                out.push(words[w]);
                acc += add;
                w++;
              }
              if (w >= words.length) w = 0;
              return out.join(" ");
            };
            for (let c = 0; c < cols; c++) {
              const cx = left + c * (colW + gut);
              for (let r = 0; r < depth; r++) {
                const ly = y + r * lh;
                const hit = blocks.some(
                  (b) =>
                    c >= b.col && c < b.col + b.span && r >= b.at && r < b.at + b.lines,
                );
                if (hit) continue;
                g.fillText(line(), cx, ly);
              }
            }

            /* THE HAIRLINES, BROKEN WHERE A BLOCK CROSSES THEM.
             *
             * A rule between two columns was drawn down the whole depth of the
             * page, and the blocks are painted before it — so any picture
             * spanning that boundary got a line ruled straight through it. The
             * line belongs between COLUMNS OF TYPE; where a block bridges them
             * there are no two columns to separate. Each boundary is therefore
             * drawn in the segments the blocks leave it. */
            for (let c = 1; c < cols; c++) {
              const lx = R(left + c * (colW + gut) - gut / 2);
              const gaps = blocks
                .filter((b) => b.col < c && b.col + b.span > c)
                .map((b) => [b.at, b.at + b.lines])
                .sort((a, b) => a[0] - b[0]);
              let r = 0;
              for (const [g0, g1] of gaps) {
                if (g0 > r)
                  g.fillRect(lx, R(y - fs + r * lh), 1, R((g0 - r) * lh - AIR_B));
                r = Math.max(r, g1);
              }
              if (r < depth) g.fillRect(lx, R(y - fs + r * lh), 1, R((depth - r) * lh));
            }
          };

          /* A STORY PAGE DOES NOT REFLOW. It slides.
           *
           * Opening the hole by whole line-slots is what the flow already
           * knew how to do, and it is visibly stepped: a jump of a line at a
           * time reads as a stutter, not as paper making room. So a story
           * page does not use the slot flow at all. The words are broken
           * ONCE — the same words in the same measure, so re-breaking them
           * every frame would be work for nothing — and the lines below the
           * hole are drawn lower, by a number of pixels that can be any
           * number. The gap opens continuously and the type slides with it.
           *
           * The columns the block does not cross never move: that is what
           * makes it read as room made IN the article rather than the
           * article shoved aside.
           *
           * WHERE the room is made, and WHAT goes in it, are drawn again at
           * the top of every telling. Twelve drawings and a page that can
           * take one in any of its columns is a lot of pages; the same chart
           * arriving in the same corner every time is one. */
          if (S.story) {
            const AIR_T = 5,
              AIR_B = 8;
            const rnd = seeded(LOAD_SALT + (S.i || 0) * 7919 + 13);

            // the words, broken once
            g.font = fs + "px " + SERIF;
            const words = LOREM.split(" ");
            let wi = 0;
            const COL = [];
            for (let c = 0; c < cols; c++) {
              const col = [];
              for (let r = 0; r < depth; r++) {
                const out = [];
                let acc = 0;
                while (wi < words.length) {
                  const add = g.measureText((out.length ? " " : "") + words[wi]).width;
                  if (acc + add > colW && out.length) break;
                  out.push(words[wi]);
                  acc += add;
                  wi++;
                }
                if (wi >= words.length) wi = 0;
                col.push(out.join(" "));
              }
              COL.push(col);
            }

            /* The cast. A drawing, a measure to give it, and a place in the
             * article to open. Held on the page rather than recomputed while
             * painting, because a chart that changed identity between two
             * frames of the same telling is not a graphic. */
            let B = null;
            /* THE HOLE IS DECIDED FIRST, and the drawing is dealt to it.
             * It used to run the other way — deal a drawing, then make a
             * hole — which meant a bar chart could be handed a single
             * column of a three-column page and simply not work there.
             * The room a page has to give is a fact about the page; what
             * goes in it is the choice. */
            const recast = () => {
              const span = 1 + Math.floor(rnd() * cols);
              const col = Math.floor(rnd() * (cols - span + 1));
              const lines = Math.max(
                5,
                Math.min(depth - 3, Math.round(depth * (0.3 + rnd() * 0.34))),
              );
              const at = 2 + Math.floor(rnd() * Math.max(1, depth - lines - 3));
              const bwNow = colW * span + gut * (span - 1),
                bhNow = lines * lh - AIR_T - AIR_B;
              /* NOT ONE ANOTHER WEB IS ALREADY SHOWING. The deck alone only
               * guarantees that six pages differ, and the pages recast one
               * at a time as each comes into the frame — so a page dealt a
               * bar chart could open beside another still holding one from
               * the pass before. What is on screen is the constraint, so it
               * is what the deal is told about. */
              const busy = [];
              for (const o of LIVE_HOLES)
                if (o !== hole && o.seen && o.kind) busy.push(o.kind);
              const kind = dealKind(rnd, bwNow / Math.max(1, bhNow), busy);
              B = {
                kind, col, span, at, lines,
                bx: left + col * (colW + gut),
                bw: colW * span + gut * (span - 1),
                byTop: y - fs + at * lh + AIR_T,
                fullPx: lines * lh,
              };
              hole.kind = kind;
              hole.seed = Math.floor(rnd() * 1e9);
              // one set of numbers for this telling, and they do not move
              // and a new ink each time, so a page is not one colour for ever
              hole.tone = inkFor(rnd);
              hole.vals = castValues(rnd);
              hole.asked = -1;
            };

            let inner = null;
            const paint = (open) => {
              if (!B) recast();
              const px = open * B.fullPx;
              const holeH = px - AIR_T - AIR_B;
              inner =
                holeH > 6
                  ? { x: R(B.bx) + 1, y: R(B.byTop) + 1, w: R(B.bw) - 2, h: R(holeH) - 2 }
                  : null;

              g.fillStyle = "#111111";
              g.font = fs + "px " + SERIF;
              g.textAlign = "left";
              for (let c = 0; c < cols; c++) {
                const cx = left + c * (colW + gut);
                const crossed = c >= B.col && c < B.col + B.span;
                for (let r = 0; r < depth; r++) {
                  const ly = y + r * lh + (crossed && r >= B.at ? px : 0);
                  if (ly > bot) break; // pushed off the foot of the page
                  g.fillText(COL[c][r], cx, ly);
                }
              }

              if (inner) {
                g.save();
                g.strokeStyle = "rgba(20,20,28,.45)";
                g.lineWidth = 1;
                g.strokeRect(R(B.bx) + 0.5, R(B.byTop) + 0.5, R(B.bw) - 1, R(holeH) - 1);
                g.restore();
              }

              /* The hairlines, broken around the hole. A rule belongs between
               * two columns of type; where the hole bridges them there are no
               * two columns to separate. */
              g.fillStyle = "#111111";
              const top0 = R(y - fs);
              for (let c = 1; c < cols; c++) {
                const lx = R(left + c * (colW + gut) - gut / 2);
                if (!(B.col < c && B.col + B.span > c && inner)) {
                  g.fillRect(lx, top0, 1, R(bot - (y - fs)));
                } else {
                  g.fillRect(lx, top0, 1, Math.max(0, R(B.byTop - AIR_T - (y - fs))));
                  const under = R(B.byTop + holeH + AIR_B);
                  if (under < bot) g.fillRect(lx, under, 1, R(bot - under));
                }
              }
            };

            const bandY = R(y - fs - 3),
              bandH = R(bot - bandY + 5);
            const hole = {
              story: true,
              x: R(x0), y: bandY, w: GALLEY_COL, h: bandH,
              kind: "bars",
              tone: S.tone || "#b3402a",
              phase: S.phase || 0,
              slot: S.slot === undefined ? S.i || 0 : S.slot,
              seed: (S.i || 0) * 131 + 7,
              recast,
              // the drawing is always asked for at the hole's FULL size, so
              // it is not remade at every height it passes through
              full: () => ({ w: R(B.bw) - 2, h: R(B.fullPx - AIR_T - AIR_B) - 2 }),
              paint,
              inner: () => inner,
            };
            recast();
            paint(0);
            LIVE_HOLES.push(hole);
          } else {
            body(1);
          }
          return top + capH;
        },

        /* A FOUNDING PLATE. A page of TEXT about a sheet, with the sheet set
         * into it — not a picture with a caption, which is what it was and
         * what made it read as a page with something left out. The plate takes
         * one column; the words take the page. */
        landmark(K, x0, top, capH) {
          const M = 18,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          g.textAlign = "center";
          let y = top + 26;
          g.font = "9px " + SERIF;
          track(String(K.year), mid, y, 9 * 0.5);
          y += 11;
          rule(left, y, meas, 1);
          y += 26;
          let hs = 19;
          for (;;) {
            g.font = "400 " + R(hs) + "px " + SERIF;
            if (g.measureText(K.src).width <= meas * 0.9 || hs < 9) break;
            hs *= 0.94;
          }
          for (const l of wrapTo(K.src, meas * 0.9, "400 " + R(hs) + "px " + SERIF)) {
            track(l, mid, y, hs * 0.03);
            y += R(hs * 1.16);
          }
          y += 6;
          g.font = "7.5px " + SERIF;
          track(K.by.toUpperCase(), mid, y, 7.5 * 0.6);
          y += 10;
          rule(mid - meas * 0.14, y, meas * 0.28, 1);
          y += 22;

          const fs = 9,
            lh = 12.4,
            gut = 9,
            colW = (meas - gut) / 2;
          const bot = top + capH - 16;
          const im = K.img ? PRESS_IMG.get(K.img) : null;
          let after = y;
          if (im && im.width) {
            const b = plateBox(left + colW + gut, y - fs, colW, colW * 1.15, im);
            g.save();
            g.beginPath();
            g.rect(R(b.x), R(b.y), R(b.w), R(b.h));
            g.clip();
            g.drawImage(im, R(b.x), R(b.y), R(b.w), R(b.h));
            g.globalCompositeOperation = "saturation";
            g.fillStyle = "#808080";
            g.fillRect(R(b.x), R(b.y), R(b.w), R(b.h));
            g.globalCompositeOperation = "source-over";
            g.restore();
            g.fillStyle = "rgba(20,20,28,.16)";
            g.fillRect(R(b.x), R(b.y + b.h), R(b.w), 1);
            g.fillStyle = "#111111";
            g.font = "7px " + SERIF;
            g.textAlign = "left";
            let cy = b.y + b.h + 10;
            for (const l of wrapTo(K.what, colW, "7px " + SERIF)) {
              g.fillText(l, b.x, cy);
              cy += 9;
            }
            after = cy + 8;
          }
          g.textAlign = "left";
          const lines = wrapTo(K.body, colW, fs + "px " + SERIF);
          let li = 0;
          for (let c = 0; c < 2; c++) {
            const cx = left + c * (colW + gut);
            let ly = c === 1 ? after : y;
            while (ly < bot && li < lines.length) {
              g.fillText(lines[li++], cx, ly);
              ly += lh;
            }
          }
          return top + capH;
        },

        /* THE MASSES. A radical arts monthly of 1917, and nothing about it is
         * genteel: everything ranged LEFT, a heavy rule, the title big and
         * flush, no ornament, no initial, and a great deal of air above it.
         * Set beside the Atlantic it should read as a different century, which
         * is very nearly what it was. */
        review(A, x0, top, capH, fill) {
          const M = 26,
            meas = GALLEY_COL - M * 2,
            left = x0 + M;
          g.textAlign = "left";
          let y = top + 34;
          const nm = A.paper.toUpperCase();
          const ms = fit(nm, "700", 11, meas * 0.5);
          g.font = "700 " + ms + "px " + SERIF;
          trackDraw(nm, left, y, ms * 0.3);
          y += 14;
          rule(left, y, meas, 4);
          y += 50;
          let hs = 32;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "700", 32, meas * 0.98));
          g.font = "700 " + hs + "px " + SERIF;
          for (const l of A.head) {
            g.fillText(l, left, y);
            y += R(hs * 1.02);
          }
          y += 10;
          const ss = fit(A.sub, "italic 400", 10, meas * 0.9);
          g.font = "italic 400 " + ss + "px " + SERIF;
          g.fillText(A.sub, left, y);
          y += 16;
          g.font = "7.5px " + SERIF;
          trackDraw(A.by, left, y, 7.5 * 0.55);
          y += 12;
          rule(left, y, meas * 0.22, 1);
          y += 30;
          const end = flowCol(A, {
            left, meas, top: y, bot: top + capH - 22,
            fs: 9.5, lh: 14.8, cols: 1, fill,
            openCaps: 5,
          });
          rule(left, end + 10, meas * 0.22, 4);
          return end + 26;
        },

        /* McCLURE'S. The muckraking monthly led with its picture: a headpiece
         * across the measure at the very top, the magazine's name over it, and
         * the title underneath. It was set as `rail` before this — a daily
         * paper's template, with a boxed dateline that collided with its own
         * masthead and no furniture at the head of the page at all. */
        pictorial(A, x0, top, capH, fill) {
          const M = 20,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          g.textAlign = "center";
          let y = top + 24;
          const nm = A.paper.toUpperCase();
          const ms = fit(nm, "400", 9.5, meas * 0.66);
          g.font = ms + "px " + SERIF;
          track(nm, mid, y, ms * 0.48);
          y += 13;
          rule(left, y, meas, 1);
          y += 32;
          let hs = 24;
          for (const l of A.head)
            hs = Math.min(hs, fit(l, "700", 24, meas * 0.92));
          g.font = "700 " + hs + "px " + SERIF;
          for (const l of A.head) {
            g.fillText(l, mid, y);
            y += R(hs * 1.1);
          }
          y += 9;
          const ss = fit(A.sub, "400", 9, meas * 0.9);
          g.font = ss + "px " + SERIF;
          g.fillText(A.sub, mid, y);
          y += 12;
          rule(mid - meas * 0.12, y, meas * 0.24, 1);
          y += 17;
          g.font = "7.5px " + SERIF;
          track(A.by, mid, y, 7.5 * 0.6);
          y += 20;
          /* The picture, AFTER the title it belongs to. It led the page before
           * this, which put it in front of the thing it illustrates — a reader
           * met the building before being told whose building it was. */
          if (A.cut) {
            const b = plateBox(left + meas * 0.17, y, meas * 0.66, 150, imgOf(A));
            y = cut(b.x, b.y, b.w, b.h, A.cap, imgOf(A), "centre") + 14;
          }
          g.textAlign = "left";
          const end = flowCol(A, {
            left, meas, top: y, bot: top + capH - 20,
            fs: 8.8, lh: 12.4, cols: 2, fill,
            openCaps: 3,
          });
          diamond(mid, end + 9, 2.2);
          return end + 24;
        },

        // eight point and hairlines. a price between two rules, a deck that
        // steps down a size a line at a time, and no plate: the presses of
        // 1835 had none
        penny(A, x0, top, capH, fill) {
          const M = 10,
            meas = GALLEY_COL - M * 2,
            left = x0 + M,
            mid = x0 + GALLEY_COL / 2;
          /* The masthead sat sixteen rows under the hairline above it and
           * seven above the triple rule below — and at twenty-one point the
           * caps reach fifteen rows above their own baseline, so the name
           * touched the line over it on all three penny papers. Both gaps are
           * measured from the size the name actually came out at instead of
           * being numbers that happened to clear a smaller one. */
          let y = top + 12;
          rule(left, y, meas, 1);
          g.textAlign = "center";
          const ms = fit(A.paper, "700", 21, meas * 0.8);
          y += R(ms * 0.74) + 13;
          g.font = "700 " + ms + "px " + SERIF;
          g.fillText(A.paper, mid, y);
          y += 12;
          rule(left, y, meas, 3);
          y += 6;
          rule(left, y, meas, 1);
          y += 13;
          g.font = "7px " + SERIF;
          g.textAlign = "left";
          g.fillText(A.date, left, y);
          g.textAlign = "center";
          g.fillText("PRICE ONE PENNY", mid, y);
          g.textAlign = "right";
          g.fillText(A.by, left + meas, y);
          y += 5;
          rule(left, y, meas, 1);
          y += 20;
          g.textAlign = "center";
          let hs = 19;
          for (const l of A.head) hs = Math.min(hs, fit(l, "700", 19, meas));
          for (const l of A.head) {
            g.font = "700 " + R(hs) + "px " + SERIF;
            g.fillText(l, mid, y);
            y += R(hs * 1.12);
            hs *= 0.84;
          }
          const ss = fit(A.sub, "400", 8.5, meas * 0.95);
          g.font = ss + "px " + SERIF;
          g.fillText(A.sub, mid, y);
          y += 8;
          rule(mid - meas * 0.2, y, meas * 0.4, 1);
          y += 14;
          g.textAlign = "left";
          return (
            flowCol(A, {
              left,
              meas,
              top: y,
              bot: top + capH - 12,
              fs: 7.6,
              lh: 10.2,
              cols: 2,
              fill,
            }) + 12
          );
        },

        // the name ranged left, the dateline boxed off to its right between
        // two hairlines, and a heavy rule under both
        rail(A, x0, top, capH, fill) {
          const M = 13,
            meas = GALLEY_COL - M * 2,
            left = x0 + M;
          g.textAlign = "left";
          /* The head, rebuilt. The name was fitted to sixty per cent of the
           * measure and set on a baseline fourteen rows under the top rule of
           * the dateline box beside it, so at any size over about seventeen
           * its ascenders ran into that rule — and the page began on nothing
           * at all, no furniture above the name. It opens on a hairline now,
           * and the box is dropped clear of the name's line. */
          rule(left, top + 11, meas, 1);
          const ms = fit(A.paper, "700", 19, meas * 0.54);
          g.font = "700 " + ms + "px " + SERIF;
          g.fillText(A.paper, left, top + 40);
          const bx = left + meas * 0.6,
            bw = meas * 0.4,
            bt = top + 22,
            bh = 21;
          rule(bx, bt, bw, 1);
          rule(bx, bt + bh, bw, 1);
          g.textAlign = "right";
          g.font = "7px " + SERIF;
          g.fillText(A.date, left + meas, bt + 9);
          g.fillText(A.by, left + meas, bt + 18);
          let y = top + 50;
          rule(left, y, meas, 2);
          y += 26;
          g.textAlign = "left";
          let hs = 26;
          for (const l of A.head) hs = Math.min(hs, fit(l, "700", 26, meas * 0.94));
          g.font = "700 " + hs + "px " + SERIF;
          for (const l of A.head) {
            g.fillText(l, left, y);
            y += R(hs * 1.05);
          }
          y += 3;
          const ss = fit(A.sub, "400", 9.5, meas);
          g.font = ss + "px " + SERIF;
          g.fillText(A.sub, left, y);
          y += 8;
          rule(left, y, meas * 0.34, 1);
          y += 18;
          const fs = 9,
            lh = 12.2;
          /* Full measure, for the same reason the monthly's is. Inset to half
           * a single-column measure the text could not run beside it — it
           * jumped the whole line — and left an L of white with an orphan
           * stranded under the picture. */
          /* The cut heads the SECOND column rather than opening the whole
           * measure. At full measure a portrait engraving is enormous and sits
           * ON the page rather than in it; a column is the size it wants. */
          const colW2 = (meas - 9) / 2;
          const plate = A.cut
            ? plateBox(left + colW2 + 9, y - fs, colW2, colW2 * 1.3, imgOf(A))
            : null;
          if (plate)
            plate.h =
              cut(plate.x, plate.y, plate.w, plate.h, A.cap, imgOf(A)) - plate.y;
          return (
            flowCol(A, {
              left,
              meas,
              top: y,
              bot: top + capH - 12,
              fs,
              lh,
              cols: 2,
              fill,
              plate,
            }) + 12
          );
        },
      };
    }

    function buildGalley() {
      // The run: every paper by its dateline, then the modern pages.
      const yearOf = (A) => parseInt((A.date.match(/\d{4}/) || ["1900"])[0], 10);
      CUTS.length = 0;
      PAGES.length = 0;
      /* The reel is the thirty templates now, in rung order. The papers and
       * the plates are still in this file and still composed by their own
       * presses; they come back when there is content to put in them. What is
       * being looked at first is the SHAPE of the pages. */
      /* THE HEAD IS DERIVED, not chosen. Written into each spec by hand it
       * repeated twice on four rungs and three times on the fifth — six pages
       * cannot have six different tops if there are only four tops and a
       * person picking them. The nth page of a rung takes the nth head, so a
       * repeat inside a rung is now impossible rather than merely unintended. */
      /* The column, capped so the run fits one texture. */
      const maxTex = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 16384;
      /* HOW MANY PAGES A WEB GETS. Six rather than nine because there are
       * three columns of them now and the sheet is stored at twice the
       * size: nine each would be ninety megabytes of texture. Eighteen
       * distinct pages across the three is twice the variety the one shared
       * column of nine had, and no web can repeat another's. */
      const PER_COL = 6;
      /* The supersample, and then the measure, both capped by the card in
       * both directions — three columns across and the reel down. Guessed
       * rather than measured, this fails SILENTLY: the upload is refused and
       * the webs read a texture that was never there. */
      /* TWO TEXELS TO THE UNIT ON A RETINA SCREEN, one on a plain one — and
       * the point is that both ends are wrong the other way round. A sheet
       * is about a third of the frame wide, so at two device pixels to the
       * CSS pixel a four-hundred-unit column is magnified two and a half
       * times, and at one device pixel an eight-hundred-texel column would
       * be MINIFIED — which without a mipmap chain is aliasing on every
       * hairline. The sheet is stored at the resolution it is looked at. */
      GALLEY_SS = Math.max(
        1,
        Math.min(
          (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1,
          Math.floor((maxTex - 8) / (400 * GALLEY_COLS)),
          Math.floor((maxTex - 8) / (400 * PAGE_RATIO * PER_COL)),
        ),
      );
      RSCALE = Math.max(1.6, GALLEY_SS);
      const fits = Math.floor(
        (maxTex - 8) /
          (GALLEY_SS * Math.max(GALLEY_COLS, PER_COL * PAGE_RATIO)),
      );
      GALLEY_COL = Math.max(240, Math.min(400, fits));
      GALLEY_W = GALLEY_COL * GALLEY_COLS;

      const HEADS = ["centre", "band", "tracked", "left", "boxed", "shoulder"];
      const seen = {};
      REEL = SPECS.map((S, i) => {
        const k = (seen[S.rung] = (seen[S.rung] || 0) + 1) - 1;
        return { spec: { ...S, i, head: HEADS[k % HEADS.length] } };
      });

      /* ONE PAGE, EVERYWHERE. Every slot on the reel becomes the single page
       * that carries the moving graphic, so it can be watched rather than
       * waited for — one page in thirty-six comes round once every twenty
       * seconds, which is no way to judge a drawing.
       *
       * It costs nothing: the reel is the same length, so the sheet is the
       * same height and the column keeps its width, and all thirty-six holes
       * are the same drawing at the same size, so they share one flipbook.
       *
       * It also throws away what the reel is FOR. The ramp — text alone,
       * then a plate, then colour, then small charts, then the drawing
       * taking the page — only reads in order. Set this to false to have it
       * back. */
      /* THE STORY, TOLD SEVERAL TIMES OVER. The reel becomes one page — an
       * article of nothing but words — repeated, and each copy starts at a
       * different point in the telling. So the paper running past carries the
       * argument at four stages at once: printed, opening, being drawn into,
       * done. Reading down a web reads it in that order.
       *
       * Four rather than thirty-six because a story page is REPAINTED, not
       * blitted: its text is set again every cycle, and thirty-six pages of
       * typesetting per cycle is not a frame budget, it is a job.
       *
       * Set this to false and the ramp comes back — text alone through to
       * pure dataviz, in the order it happened, which is what the reel is
       * otherwise for. */
      const REEL_STORY = true;
      /* A column of the reel, cast for one web. `i` is unique across the
       * three, because it is what seeds the page's cast and its place in
       * the opening cascade — three columns sharing an index would be three
       * webs opening the same drawing at the same instant, which is the
       * fault this was built to remove. */
      const storyReel = (c) =>
        storyPapers(PER_COL, c).map((S, n) => ({
          // `i` is unique across the sheet and seeds the page; `slot` is its
          // place in ITS OWN column, which is what the opening cascade counts
          spec: { ...S, i: c * PER_COL + n, slot: n, phase: n / PER_COL },
        }));
      if (REEL_STORY) REEL = storyReel(0);
      PAGE_STEP = 1 / Math.max(1, REEL.length);
      GALLEY_H = REEL.reduce(
        (a, E) =>
          a +
          (E.spec || E.blank
            ? Math.round(GALLEY_COL * PAGE_RATIO)
            : E.landmark
                ? Math.round(GALLEY_COL * PAGE_RATIO)
                : pageH()),
        0,
      );

      LIVE_HOLES = [];
      const SS = GALLEY_SS;
      const cv = document.createElement("canvas");
      cv.width = GALLEY_W * SS;
      cv.height = GALLEY_H * SS;
      const g = cv.getContext("2d");
      /* THE ONLY LINE THAT KNOWS. Every press below draws in page units at
       * the sizes it always drew at; the sheet under them is SS times bigger
       * in each direction, so the type is rasterised at that resolution
       * instead of being resampled up to it on the way to the screen. */
      g.setTransform(SS, 0, 0, SS, 0, 0);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, GALLEY_W, GALLEY_H);
      g.textBaseline = "alphabetic";
      const PRESS = galleyPresses(g);

      /* THREE COLUMNS, SIDE BY SIDE, one for each web. They are laid out
       * one after another so a hole knows which column it is in, and the
       * frame loop asks about a hole against that web's window alone. */
      for (let c = 0; c < GALLEY_COLS; c++) {
      const COLUMN = c === 0 ? REEL : storyReel(c);
      const x0 = c * GALLEY_COL;
      const hole0 = LIVE_HOLES.length;
      /* The run, in the order it was printed. The papers first, by their own
       * datelines, then what the desk makes. */
      let y = 0;
      for (let k = 0; k < COLUMN.length; k++) {
        const E = COLUMN[k];
        const h = E.spec || E.blank
          ? Math.round(GALLEY_COL * PAGE_RATIO)
          : E.landmark
            ? Math.round(GALLEY_COL * PAGE_RATIO)
            : pageH();
        g.save();
        g.beginPath();
        g.rect(x0, y, GALLEY_COL, h);
        g.clip();
        g.fillStyle = "#111111";
        g.textAlign = "left";
        if (E.spec) {
          PRESS.spec(E.spec, x0, y, h);
        } else if (E.blank) {
          PRESS.blank(E.blank, x0, y, h);
        } else if (E.landmark) {
          PRESS.landmark(E.landmark, x0, y, h);
        } else {
          // what the page carries on when the story runs out: the papers that
          // follow it on the reel, so a column never has a hole in it
          const fill = [];
          for (let n = 1; n <= 3; n++) {
            const F = COLUMN[(k + n) % COLUMN.length];
            if (F && !F.modern) fill.push(F.A);
          }
          (PRESS[E.A.tpl] || PRESS.broadsheet)(E.A, x0, y, h, fill);
        }
        g.restore();
        if (c === 0) CUTS.push(y / GALLEY_H);
        /* The bench publishes what it composed: which rung each page is on,
         * what it is, and where it sits on the sheet. The catalogue page reads
         * this to cut the reel up and lay it out. Only this parked copy does
         * it — the delivered module publishes nothing. */
        if (c === 0) PAGES.push({
          /* The rung is what the page IS, never when it was printed. A
           * founding plate is an image whatever its year, so it says which
           * rung it belongs to itself: Snow is one ink, the other four were
           * coloured by hand. And text alone means ALONE — a paper with a cut
           * in it is on the second rung, not the first. */
          rung: E.spec
            ? E.spec.rung
            : E.blank
              ? E.blank.rung
              : E.landmark
              ? E.landmark.rung
              : E.A.cut
                ? 2
                : 1,
          year: E.spec ? "layout" : String(E.year),
          what: E.spec
            ? E.spec.name
            : E.blank
              ? E.blank.need
              : E.landmark
              ? E.landmark.src + " — " + E.landmark.by
              : E.A.paper,
          tpl: E.spec
            ? "template · " + E.spec.cols + (E.spec.cols > 1 ? " columns" : " column")
            : E.blank
              ? "to produce"
              : E.landmark
                ? "landmark"
                : E.A.tpl,
          todo: !!E.blank,
          y,
          h,
        });
        y += h;
      }
      // every hole this column just laid down belongs to the web that reads
      // it, and to no other
      for (let i = hole0; i < LIVE_HOLES.length; i++) LIVE_HOLES[i].col = c;
      }
      window.__specs = SPECS; // the bench publishes them so they can be checked
      window.__galleySheet = cv;
      window.__liveHoles = LIVE_HOLES; // the bench, again
      window.__galleyPages = PAGES;
      /* The page rectangles above are in PAGE UNITS and describe the first
       * column only; the sheet is three columns wide and stored at this many
       * texels to the unit. The catalogue needs both numbers to cut a page
       * out of it. */
      window.__galleyScale = GALLEY_SS;
      window.__galleyCol = GALLEY_COL;
      // kept, because the moving blocks write back into it: a page has to
      // stay correct if the whole reel is ever uploaded again
      galleyCv = cv;
      return cv;
    }

    /* ------------------------------------------------------------ the glass */
    const VS = `#version 300 es
in vec2 p;
out vec2 vUv;
void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }`;

    /* ------------------------------------------------------------ the plates
     * Flat rectangles with a picture on them do not need a distance field.
     * They are drawn as quads, projected with the same camera the marcher
     * uses, sorted back to front and painted over. What cost 72 marching steps
     * a pixel now costs one triangle pair each.
     */
    const QUAD_VS = `#version 300 es
in vec2 p;
uniform vec3 uC, uAx, uAy, uAz;  // centre, half-axes, and the sheet's normal
uniform vec2 uRes, uCentre;
uniform float uZoom, uBend, uT;
/* Where the pointer falls on THIS sheet, in the sheet's own coordinates,
 * and how hard it presses. Sent per web because each one is at its own
 * place and depth, so the same cursor is somewhere different on each. */
uniform vec2 uPtr;
/* strength, radius, and the sheet's own aspect. The aspect is not a detail:
 * p runs -1..1 on both axes whatever shape the sheet is, and these sheets
 * are two and a half times taller than they are wide — so a round footprint
 * in p is an ellipse two and a half times too tall in the world, which is
 * why the lift looked like a ridge and not like something under the page. */
uniform vec3 uPtrK;
/* HOW HARD THE SLOPE SHADES. The wave and the pointer both carry their own
 * amplitude already; this is the strength of the shading they cause, and it
 * scales the clamp with it — at zero the sheet is evenly lit however far it
 * bends, at one it is the full contrast the surface can make. */
uniform float uShade;
/* THE SURFACE ALL THREE SHEETS LIE ON: its radius in world units, how hard a
 * sheet turning away from the camera loses its light, and how much of the
 * curve is carried in the VERTICAL as well as the horizontal. A radius of
 * zero is a flat row. The per-sheet wave is what a single sheet of paper
 * does; this is what the SET does. */
uniform vec3 uCurve;
out vec2 vUv;
out float vShade;
out float vEdge;
void main(){
  // The plates are flat and pass straight through. The page is a sheet of
  // paper: it is subdivided and lifted off its own plane by three travelling
  // waves, and the slope of that surface shades it, which is what stops a
  // curved sheet from reading as a printed rectangle.
  /* Each surface carries its own slope, and each is weighted by ITS OWN
   * amplitude at the end. The bulge used to be normalised by dividing its
   * gradient by uBend, which is fine until uBend is zero — then the term
   * goes to infinity and the shading clamps across the whole sheet. A
   * scale that has to be divided out is a scale in the wrong place. */
  /* ONE WAVE FIELD, NOT THREE. The ripple used to be a function of the
   * sheet's OWN coordinates, so each of the three carried a private copy of
   * the same shape — and they had to be pushed out of phase with each other
   * or the set read as one image cut into three. That was the right fix for
   * three separate sheets. It is the wrong one now the three lie on a single
   * curved surface: a crest reaching the edge of the middle column stopped
   * dead there, and the next column started its own somewhere else.
   *
   * The field is world-anchored instead. p is the sheet's own -1..1, and the
   * sheet's centre expressed in those same units is uC over its half-axis —
   * so adding the two gives a coordinate that is continuous across the whole
   * set, at exactly the wavelength a sheet had before. A crest leaving one
   * column arrives on the next where it should, gap included.
   *
   * The slopes are untouched by this: the offset is a constant per sheet, so
   * the derivative with respect to p is what it always was. */
  vec2 g = p + vec2(uC.x / max(abs(uAx.x), 1e-4),
                    uC.y / max(abs(uAy.y), 1e-4));
  float w = 0.0, sh = 1.0;
  float wdx = 0.0, wdy = 0.0;
  if(uBend > 0.0001){
    w  = sin(g.x*3.1 + uT*0.9)*0.45 + sin(g.y*2.3 - uT*0.7)*0.32
       + sin((g.x + g.y)*1.9 + uT*1.3)*0.23;
    wdx = cos(g.x*3.1 + uT*0.9)*3.1*0.45 + cos((g.x + g.y)*1.9 + uT*1.3)*1.9*0.23;
    wdy = cos(g.y*2.3 - uT*0.7)*2.3*0.32 + cos((g.x + g.y)*1.9 + uT*1.3)*1.9*0.23;
  }
  /* A HAND UNDER THE SHEET. The paper lifts where the pointer is and falls
   * away from it — one soft bell, not a ripple, because a ripple is water
   * and this is newsprint. Its own slope goes into the shading with the
   * waves', so the bulge catches the light rather than being a bump you
   * can only tell is there by the type moving. */
  float bulge = 0.0, bdx = 0.0, bdy = 0.0;
  if(uPtrK.x > 0.0001){
    // measured round in the WORLD: the aspect is what was missing, not the
    // profile
    vec2 q = (p - uPtr) * vec2(1.0, uPtrK.z) / max(uPtrK.y, 1e-3);
    /* A BELL, not a dome. A sphere under paper has a rim, and a rim is a
     * hard thing: it reads as an object put under the page rather than as
     * the page being lifted. The soft one was right — it was only ever
     * WRONGLY SHAPED, stretched two and a half times up the sheet because
     * p runs -1..1 on both axes whatever proportion the sheet is. */
    float e = exp(-dot(q, q) * 1.6);
    bulge = e;
    float g = -4.0 * e / max(uPtrK.y, 1e-3);
    bdx = q.x * g;
    bdy = q.y * g * uPtrK.z;
  }
  sh = clamp(
    1.0 - ((wdx*uBend + bdx*uPtrK.x) * 0.20
         + (wdy*uBend + bdy*uPtrK.x) * 0.13) * 2.6 * uShade,
    mix(1.0, 0.62, uShade), mix(1.0, 1.34, uShade));
  vec3 P = uC + uAx*p.x + uAy*p.y + uAz*(w*uBend + bulge*uPtrK.x);
  /* ONE CURVE UNDER ALL THREE. Read as polar coordinates about the vertical
   * axis: x becomes an angle and z becomes a distance from it, so a point far
   * to the side swings back AND turns to face the middle. Applied after the
   * wave, so a sheet's own lift stays perpendicular to the curved surface it
   * is lifting off rather than to the flat one it used to be on.
   *
   * And it shades. A surface turning away from the camera catches less light
   * whatever its own local slope is doing; without this the three read as one
   * flat row that has merely been moved, which is the thing being fixed. */
  /* A CYLINDER CURVES IN ONE DIRECTION ONLY. About the vertical, the outer
   * columns turn toward the middle and fall away — but a point at the top of
   * a sheet is at exactly the same depth as one at its foot, so the set is a
   * curved wall and reads as one: nothing recedes as it goes up.
   *
   * The surface is an ELLIPSOID instead. x becomes a longitude, y a latitude,
   * and z the distance from the middle of it, so the four corners of the set
   * all fall away and the whole thing is curved everywhere rather than in the
   * one direction that happened to be easy.
   *
   * The two radii are not independent settings — one is the other over uDome,
   * so 1 is a sphere and 0 is the cylinder it used to be, continuously. At
   * uDome near zero the latitude goes to nothing while the radius it is
   * measured against goes to infinity, and the two cancel exactly: the height
   * comes through untouched rather than collapsing. */
  if (uCurve.x > 0.0) {
    float R = uCurve.x;
    float Ry = R / max(uCurve.z, 1e-4);
    float a = P.x / R;
    float b = P.y / Ry;
    float ca = cos(a), cb = cos(b);
    P = vec3(
      sin(a) * cb * (R + P.z),
      sin(b) * (Ry + P.z),
      ca * cb * (R + P.z) - R);
    sh *= 1.0 - (1.0 - ca * cb) * uCurve.y;
  }
  float d = max(0.08, uZoom - P.z);
  vec2 uvp = P.xy * 2.05 / d + uCentre;
  gl_Position = vec4(uvp.x * 2.0 * uRes.y / uRes.x, uvp.y * 2.0, 0.0, 1.0);
  vUv = p*0.5 + 0.5;
  vShade = sh;
  vEdge = uvp.y * 2.0;   // where this fragment sits in the frame, for the fade
}`;

    const QUAD_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uTile, uTiles, uAlpha, uLift, uSpin;
// The window a web reads out of the galley: origin and span, in texture
// coordinates. Zero span means "no window" — every plate takes that path and
// samples the atlas exactly as before.
uniform vec4 uWin;
/* THE INK CURVE, on the webs only.
 *
 * A column of newsprint four hundred texels wide is shown about two hundred
 * and fifty wide, so every texel the card sees is a MIPMAP AVERAGE of ink and
 * paper. Nine-point type averaged with the paper around it is grey, and on a
 * paper ground grey type on near-white paper is what "not readable" looks
 * like. The curve pushes the two apart again before the ground mapping: what
 * was below the pivot goes to black, what was above it stays paper. x is the
 * pivot, y the steepness; a zero y leaves the sample alone, which is what
 * every plate passes. */
uniform vec3 uInkC;   // pivot, gain, mip bias
uniform vec3 uBG;
uniform float uRoom, uExposure, uPresence;
// The flood at the end of the chapter: the sheet is taken to one flat colour
// so the ink, the headline and the photograph go together instead of the
// darkest parts of the page surviving a lift. Zero for every plate.
uniform float uWash;
uniform vec3 uWashC;
in vec2 vUv;
in float vShade;
in float vEdge;
// Where the paper starts leaving the frame, as a height in clip space. A web
// that ran to the edge would put newsprint under the navigation and under the
// standfirst, and neither could then be read; it also lies about the press,
// where the web comes out of the machine and goes back into it. Zero for every
// plate — they keep their hard edges.
uniform float uEdge;
out vec4 outColor;
void main(){
  // the sheet's v runs the other way from the canvas, so it is flipped here —
  // before the tile offset, never after: after, it mirrors the atlas itself and
  // every plate reads a row it did not ask for
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 st = uv;
  if(uTiles > 0.5){
    float t = mod(uTile, uTiles*uTiles);
    // turned inside the tile by the plate's own quarter turn
    vec2 q = uSpin > 2.5 ? vec2(1.0 - uv.y, uv.x)
           : uSpin > 1.5 ? vec2(1.0 - uv.x, 1.0 - uv.y)
           : uSpin > 0.5 ? vec2(uv.y, 1.0 - uv.x) : uv;
    st = (vec2(mod(t, uTiles), floor(t/uTiles)) + clamp(q, 0.0, 1.0)) / uTiles;
  } else if(uWin.w > 0.0){
    // The web is a window onto one column of the galley, slid along v. Only v
    // wraps — the texture repeats vertically and clamps horizontally, so a
    // column can never bleed into the one set beside it.
    st = vec2(uWin.x + clamp(uv.x, 0.0, 1.0)*uWin.z, uWin.y + uv.y*uWin.w);
  }
  /* The bias is spent. It asked for a sharper mip than the card would pick,
   * because the level chosen from the rate the coordinates change had already
   * averaged the ink away — a workaround for a reel stored at less resolution
   * than it was looked at. The reel is stored at the resolution it is looked
   * at now and carries no mip chain at all, so this samples the sheet. */
  vec3 base = texture(uTex, st, uInkC.z).rgb;
  if(uInkC.y > 0.0) base = clamp((base - uInkC.x) * uInkC.y + uInkC.x, 0.0, 1.0);
  vec3 col = base * uLift * vShade;
  col = 1.0 - exp(-col * uExposure);
  float R = 1.0 - exp(-uRoom*uExposure);
  vec3  up = clamp((col - R)/max(1.0 - R, 1e-3), 0.0, 1.0);
  vec3  dn = clamp(col/max(R, 1e-3), 0.0, 1.0);
  col = mix(uBG*dn, mix(uBG, vec3(1.0), up), step(vec3(R), col));
  vec3 lit = mix(uBG, max(col, 0.0), uPresence);
  float fade = uEdge > 0.0
    ? 1.0 - smoothstep(uEdge, uEdge + 0.40, abs(vEdge))
    : 1.0;
  outColor = vec4(mix(lit, uWashC, uWash), uAlpha * fade);
}`;


    /* Inside the block. Once the body has broken, the marcher has nothing
     * left to trace — but the glass should not simply stop existing: the
     * camera has gone INTO it, so everything from here on is seen from within
     * the material. The field is drawn into the buffer and read back through a
     * wall: bent toward the middle, split into its colours, and thickened at
     * the edge, all of it growing with the distance from the centre the way
     * the path length through a slab does.
     *
     * It is the same physics the marcher runs, minus the marching — the reason
     * it can afford to run on every pixel of every frame.
     */
    const GLASS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3  uBG;
uniform float uAmt, uAspect, uBend, uDisp, uRim;
uniform float uT, uAmp, uFreq, uSpeed, uBand, uSheen;
uniform vec2  uCentre;
uniform mat3  uSpin;
in vec2 vUv;
out vec4 outColor;

/* Where the wall is, along this pixel's own ray.
 *
 * Not a box. The body was never a box — it is a rounded mass that swells and
 * hollows as it turns, and from inside it the wall has no edges and no straight
 * lines: it is a surface whose distance varies smoothly with the direction you
 * look in, and goes on moving after you have stopped. So the wall is given as a
 * thickness per direction, wobbled by a handful of sines in the body's own
 * frame and drifting with the clock — the same idea as the marcher's warp,
 * minus the marching.
 *
 * There is no edge term: a blob has no edges. What reads as form is the
 * thickness changing across the frame, and changing again a moment later.
 */
float blob(vec2 uv){
  vec3 d = uSpin * normalize(vec3(uv, -2.05));
  float t = uT * uSpeed;
  float f = uFreq;
  float n = sin(d.x * 2.10 * f + t * 0.91)
          + sin(d.y * 1.73 * f - t * 0.67) * 0.85
          + sin((d.x + d.y) * 2.90 * f + t * 0.49) * 0.60
          + sin((d.z - d.x) * 2.35 * f - t * 0.37) * 0.55;
  return n / 3.0;                             // roughly -1 .. 1
}

float wallAt(vec2 uv, out float n){
  n = blob(uv);
  // thicker toward the rim, the way a curved body is, but never on a straight
  // ramp: the exponent bends it and the blob breaks it up
  float rim = pow(clamp(length(uv) * 1.55, 0.0, 1.0), 1.7);
  return clamp(rim * 0.72 + 0.26 + n * uAmp, 0.0, 1.6);
}

void main(){
  /* NOTHING TO DO IS THE COMMON CASE. Outside the break uAmt is zero, and
   * everything below — the wall field, the dispersion, the sheen, the rim —
   * multiplies by it and comes out as the buffer, unchanged. It was still
   * being evaluated for every pixel of the frame, sixty times a second, to
   * arrive at a copy. One fetch instead. */
  if (uAmt < 0.0015) { outColor = vec4(texture(uTex, vUv).rgb, 1.0); return; }
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float r = length(p) / 1.42;                  // 1 at the corner of the frame
  vec2 uvr = vec2(p.x * 0.5, p.y * 0.5) - uCentre;   // the marcher's own uv
  float n;
  float e = clamp(wallAt(uvr, n), 0.0, 1.0);   // the glass in the way, here
  vec2 dir = r > 1e-4 ? normalize(p) : vec2(0.0);
  vec2 s = vec2(1.0 / uAspect, 1.0) * 0.5;     // back into uv
  float w = e * e * uAmt;
  vec2 off = -dir * uBend * w * s;             // the wall bends what is behind it
  vec2 dd  =  dir * uDisp * w * s;             // and splits it on the way
  vec3 col;
  col.r = texture(uTex, vUv + off + dd).r;
  col.g = texture(uTex, vUv + off).g;
  col.b = texture(uTex, vUv + off - dd).b;
  // The inner wall reflects: near the edge a ghost of the far side of the
  // scene comes back at you, which is what standing inside a block of glass
  // actually looks like. Mirrored through the centre, weighted to the rim.
  vec3 back = texture(uTex, vec2(1.0) - vUv - off).rgb;
  col += max(back - uBG, 0.0) * pow(e, 3.0) * 0.40 * uAmt;
  /* What actually reads as glass is not the colour fringe — it is the light
   * being gathered and thinned by the body's own curvature. Two terms, both
   * off the same blob:
   *
   *  · bands. Where the mass is thinner the field comes through brighter,
   *    where it thickens it dims. Slow, wide, and moving, which is what tells
   *    the eye there is a body there at all.
   *  · a sheen. Where the thickness changes fastest — the shoulder of the
   *    blob — light grazes, the way it catches on a curved surface. Taken from
   *    the field's own slope, two extra samples.
   */
  col *= 1.0 + n * uBand * uAmt;
  float gx = blob(uvr + vec2(0.035, 0.0)) - blob(uvr - vec2(0.035, 0.0));
  float gy = blob(uvr + vec2(0.0, 0.035)) - blob(uvr - vec2(0.0, 0.035));
  float sheen = smoothstep(0.10, 0.55, length(vec2(gx, gy)));
  col += (uBG + 0.055) * sheen * uSheen * uAmt * (0.35 + 0.65 * e);
  /* The rim of the body itself. A blob has no edge in the sense a box has —
   * but it does have a silhouette, and the silhouette is a level set of the
   * very thickness this pass already computes. Draw the contour where the
   * thickness crosses a threshold and you get the outline of the mass, curved,
   * closed, and moving with it. fwidth keeps the line one pixel wide however
   * steep or flat the field is under it, so it never aliases and never fattens.
   */
  // thickness: the deeper the path through the material, the more it takes
  col = mix(col, col * 0.86 + uBG * 0.10, w);
  col += vec3(0.018, 0.036, 0.070) * pow(e, 3.0) * uRim * uAmt;
  outColor = vec4(col, 1.0);
}`;

    /* ---------------------------------------------------------- parameters */
    const P = {
      zoom: 6.4,
      box: 0.74,
      round: 0.26,
      warp: 0.065,
      warpF: 1.2,
      wobble: 1.0,
      aimYaw: 0.95,
      aimPitch: 0.66, // radians across the full window
      drag: 0.0062, // radians per pixel dragged
      damp: 0.94,
      relax: 0.006,
      idle: 0.055,
      ior: 1.3,
      disp: 0.26,
      absorb: 0.14,
      fres: 1.0,
      film: 0.16,
      irid: 0.85,
      gain: 2.3,
      room: 0.45,
      shade: 0.42,
      envRot: 0.0,
      soft: 0.03,
      panel: 1.0,
      exposure: 0.95,
      news: 1.0,
      pageZoom: 1.15,
      ink: 1.45,
      pageLod: 0.1,
      paper: 0.78,
      sheet: 1.0,
      curl: 0.18,
      sheetS: 0.5,
      bend: 0.16, // how far the sheet lifts off its own plane
      // the three webs. Widths and heights are fractions of what the camera
      // can see at the webs' own depth, so the composition holds on any frame
      // rather than being a set of world units tuned to one window.
      // 400 texels of column shown across 300 pixels is a minification the
      // type does not survive; at 0.21 it is close to one to one.
      webW: 0.36,
      webH: 1.35, // half-height — over one, so no end of paper is ever in shot
      // far enough apart that the ground still shows between the webs
      webCut: 0, // 0 the press runs, 1 the montage cuts
      webBeat: 0.9, // seconds a page is held before the cut
      webSpread: 0.74,
      webX: 0, // the whole set, sideways and up, in visible half-measures
      webY: 0,
      // The height at which the paper starts going back into the machine. On
      // ink a long fade reads as the web leaving; on paper it reads as a
      // gradient, so on paper it is held much later.
      // the height at which the paper goes back into the machine, which also
      // frees the header band from running over dense body type
      webEdge: 0.69,
      /* HOW FAST EACH WEB UNROLLS, in laps of the galley per second, one
       * number each. They were a shared speed and three multipliers of it,
       * which is the wrong shape for a control: reading 0.930 tells you a
       * web is seven per cent slower than something, and not how fast it is
       * going. Three speeds say what they are. */
      /* FASTER, AND FURTHER APART. Seven per cent between the three read as
       * one speed with a wobble; half again between the slowest and the
       * fastest is three presses running at three rates, which is what it
       * is. The lag between any two of them now turns over in under a
       * minute rather than in five. */
      /* And read against a SIX-page column. The rate is normalised by the
       * length of the reel where it is used, so these are the numbers off
       * the panel and they mean the same thing they showed there. */
      webSpd0: 0.0125,
      webSpd1: 0.0105,
      webSpd2: 0.0135,
      // and where each one starts, in pages
      webLag0: 0,
      webLag1: 0.37,
      webLag2: 0.71,
      // how far the paper lifts under the pointer, in half-heights
      ptrLift: 0.2,
      /* HOW WIDE, in half-widths of a sheet. Past one it reaches across
       * the gap and takes the sheet beside it too, which is what a hand
       * under a run of paper would do — the three webs are one web of
       * paper cut into columns, not three separate objects. */
      ptrSize: 2.5,
      // the mark shown while the room is being made: the word, or the
      // rosette turning
      markLogo: 1,
      // the share of pages that print in one ink and a grey
      greyShare: 1,
      // seconds of one telling: opening, drawn into, held, lifted away
      storySecs: 8.5,
      // and seconds it is left as printed after coming into shot
      storyRest: 1.5,
      // and the spread of their turns, so they never open together
      storySpread: 5,
      /* The shading the bend causes, which is not the same control as the
       * bend. The paper wants to keep its curve and lose some of the
       * contrast the curve was printing on it: at full strength the troughs
       * came down to two thirds of the ground and read as shadows thrown on
       * the sheet rather than as the sheet turning. */
      /* HOW FAR THE THREE WRAP ROUND THE READER, in radians at the edge of
       * the frame. It is an angle rather than a radius because a radius means
       * nothing without knowing how wide the frame is, and the frame changes
       * with the window; the angle is what the eye reads. Zero is a flat row. */
      webCurve: 0.10,
      /* And how much a sheet loses by turning away. It is its OWN number, not
       * a share of the wave's shading: they are two different surfaces — one
       * is the ripple in a sheet of paper, the other is where that sheet is
       * standing — and tying them together meant flattening the light on the
       * outer columns could only be done by flattening the ripple as well. */
      webCurveSh: 6.0,
      /* And how much of it is carried in the vertical: 1 is a sphere — the
       * top and foot of a sheet fall away exactly as its sides do — and 0 is
       * a cylinder, curved across and dead flat up and down. */
      webDome: 0.38,
      webShade: 0.70,
      webBend: 0.55, // how far the paper leaves its plane, relative to bend
      // The webs are the light in the frame, and are lifted to it.
      webLift: 1.12,
      /* The ink curve belonged to a paper ground. There, the mapping sent any
       * sample above 0.577 toward white, and a line of nine-point type
       * averaged by the mipmap arrives at about 0.7 — so the type came out
       * LIGHTER than the ground and could not be read at all. On ink that
       * threshold works for the webs rather than against them: the paper of
       * the web clears it and lights up, the type falls under it and darkens.
       * The curve is off, and only the mip bias is kept — a sharper level than
       * the card picks, which the type wants on any ground. */
      inkPivot: 0.84,
      inkGain: 0.0,
      inkBias: -0.65,
      // the field: changing any of these reseeds the plates
      spreadMin: 1.7,
      spreadMax: 3.1,
      plateMin: 0.27,
      plateMax: 0.15,
      depthZ: 0.6,
      glow: 0.7,
      inside: 1.0,
      insideBend: 0.1,
      insideDisp: 0.02,
      insideRim: 0.9,
      // the mass around the camera: how much its thickness varies, over what
      // scale, and how fast it drifts
      insideAmp: 0.55,
      insideFreq: 1.0,
      insideSpeed: 0.16,
      insideBand: 0.34,
      insideSheen: 0.9,
    };

    /* ------------------------------------------------------- the web tuner
     * A live panel over the webs: their size, where they sit, how fast the
     * paper runs, how hard it lifts off its plane, and the two numbers that
     * decide whether the type reads at all.
     *
     * ONLY WITH "?webs" IN THE URL. The delivered page carries no panels —
     * they were all taken out of it — and this one is not an exception to
     * that: it does not exist unless it is asked for by name. No key opens
     * it, because a key can be hit by accident and T already belongs to the
     * post-its.
     *
     * "copy" puts the whole set on the clipboard as the source lines they
     * correspond to, so a session of sliders comes back as code rather than as
     * a description of code.
     */
    const WEB_TUNE = [
      [
        "the frame",
        [
          ["webW", 0.06, 0.42, 0.005, "half-width, in visible half-widths"],
          ["webH", 0.8, 2.2, 0.01, "half-height, same measure"],
          ["webSpread", 0.2, 1.1, 0.01, "where the outer two sit"],
          ["webX", -0.6, 0.6, 0.01, "the whole set, sideways"],
          ["webY", -0.6, 0.6, 0.01, "and up or down"],
        ],
      ],
      [
        "the three webs",
        [
          ["webSpd0", 0, 0.06, 0.0005, "left · laps of the galley per second"],
          ["webSpd1", 0, 0.06, 0.0005, "middle · laps of the galley per second"],
          ["webSpd2", 0, 0.06, 0.0005, "right · laps of the galley per second"],
          ["webLag1", 0, 1, 0.01, "middle · where it starts, in pages"],
          ["webLag2", 0, 1, 0.01, "right · where it starts, in pages"],
        ],
      ],
      /* The curve of the SET, kept apart from the press's own controls. It is
       * not a property of one sheet — it is where the three are standing — and
       * a slider filed under the thing it is not is a slider nobody finds. */
      [
        "the curve of the set",
        [
          ["webCurve", 0, 1.4, 0.01, "how far the three wrap round you"],
          ["webDome", 0, 1.4, 0.01, "0 a cylinder, 1 a sphere, over 1 an egg"],
          ["webCurveSh", 0, 14, 0.1, "how much a sheet loses by turning away"],
        ],
      ],
      [
        "the press",
        [
          ["webCut", 0, 1, 1, "0 the press runs, 1 the montage cuts"],
          ["webBeat", 0.15, 2.5, 0.05, "seconds a page is held"],
          ["webBend", 0, 1.6, 0.01, "how far the paper leaves its plane"],
          ["webShade", 0, 1.4, 0.01, "how hard the WAVE shades the sheet"],
          ["ptrLift", 0, 0.6, 0.01, "how far it lifts under the pointer"],
          ["ptrSize", 0.1, 3.5, 0.05, "how far the lift reaches"],
          ["storySecs", 2, 20, 0.5, "seconds the room takes to be made"],
          ["storyRest", 0, 12, 0.25, "seconds as printed, once the page is in shot"],
          ["storySpread", 0, 40, 0.5, "how far apart the pages take their turns"],
          ["greyShare", 0, 1, 0.05, "share of pages that print in a grey"],
          ["markLogo", 0, 1, 1, "the waiting mark: 0 the word, 1 the rosette"],
        ],
      ],
      [
        "the light",
        [
          ["webLift", 0.5, 2.2, 0.01, "how bright the paper is"],
          ["webEdge", 0.25, 1.3, 0.01, "where it goes back into the machine"],
        ],
      ],
    ];

    function buildWebTuner() {
      const box = document.createElement("div");
      box.id = "web-tune";
      box.style.cssText =
        "position:fixed;top:12px;right:12px;z-index:99998;width:264px;" +
        "max-height:calc(100vh - 24px);overflow:auto;padding:12px 14px 14px;" +
        "background:rgba(14,14,18,.9);color:#e8e8e8;" +
        "border:1px solid rgba(255,255,255,.14);border-radius:10px;" +
        "font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;" +
        "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)";
      const st = document.createElement("style");
      st.textContent =
        "#web-tune .t{font-size:9px;letter-spacing:.13em;text-transform:uppercase;opacity:.5}" +
        "#web-tune .g{margin:13px 0 4px;font-size:9px;letter-spacing:.13em;" +
        "text-transform:uppercase;opacity:.36}" +
        "#web-tune .r{display:flex;align-items:center;gap:7px;margin:5px 0}" +
        "#web-tune .r label{flex:0 0 66px;opacity:.62;cursor:help}" +
        "#web-tune .r .v{flex:0 0 46px;text-align:right;opacity:.5;" +
        "font-variant-numeric:tabular-nums}" +
        "#web-tune input{flex:1;min-width:0;height:14px;-webkit-appearance:none;" +
        "appearance:none;background:transparent}" +
        "#web-tune input::-webkit-slider-runnable-track{height:2px;background:rgba(255,255,255,.2)}" +
        "#web-tune input::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;" +
        "margin-top:-4px;border-radius:50%;background:#f2b13c;cursor:pointer}" +
        "#web-tune button{width:100%;margin-top:12px;padding:7px 0;font:inherit;" +
        "color:#e8e8e8;cursor:pointer;background:rgba(255,255,255,.07);" +
        "border:1px solid rgba(255,255,255,.16);border-radius:6px}" +
        "#web-tune button:hover{background:#f2b13c;color:#14141c;border-color:#f2b13c}";
      document.head.appendChild(st);

      /* A PANEL YOU CANNOT PUT AWAY is a panel that is always in the way.
       * It covers the top right of the frame, which is where a web runs, so
       * judging the paper means judging it around the thing measuring it.
       * The cross hides it and leaves a tab; the tab brings it back without
       * a reload, so nothing that has been tuned is lost. */
      const head = document.createElement("div");
      head.className = "t";
      head.style.cssText = "display:flex;align-items:center;gap:8px";
      const name = document.createElement("span");
      name.textContent = "the webs";
      name.style.flex = "1";
      const shut = document.createElement("button");
      shut.textContent = "×";
      shut.title = "put the panel away";
      shut.style.cssText =
        "width:20px;height:20px;margin:0;padding:0;line-height:1;font-size:15px;" +
        "border-radius:5px;flex:0 0 auto";
      head.append(name, shut);
      box.appendChild(head);

      const tab = document.createElement("button");
      // named, because it is put in the document BEFORE the panel is — the
      // caller used to reach it as the panel's next sibling, which is the
      // canvas, so the tab was hidden along with the panel and there was no
      // way back to it without a reload
      tab.id = "web-tune-tab";
      tab.textContent = "the webs";
      tab.style.cssText =
        // en bas à droite : en haut il se posait sur la navigation, et un
        // outil de réglage ne doit pas couvrir un lien de la page
        "position:fixed;bottom:12px;right:12px;z-index:99998;display:none;" +
        "padding:7px 11px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;" +
        "color:#e8e8e8;cursor:pointer;background:rgba(14,14,18,.9);" +
        "border:1px solid rgba(255,255,255,.16);border-radius:8px;" +
        "-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)";
      tab.onclick = () => {
        box.style.display = "";
        tab.style.display = "none";
      };
      shut.onclick = () => {
        box.style.display = "none";
        tab.style.display = "block";
      };
      document.body.appendChild(tab);

      /* THE RATE, READ OFF THE STAGE ITSELF. Not this panel's own rAF —
       * that would measure the browser handing out frames, which keeps
       * ticking perfectly while the scene inside it stalls. The stage counts
       * the frames it actually draws, so a repaint that overruns shows up
       * here and nowhere else.
       *
       * Amber under fifty, because a number nobody reads is not a
       * diagnostic. */
      const fps = document.createElement("div");
      fps.className = "t";
      fps.style.cssText =
        "margin-top:7px;opacity:.85;font-variant-numeric:tabular-nums";
      box.appendChild(fps);
      let f0 = window.__frames || 0,
        t0 = performance.now();
      setInterval(() => {
        const f = window.__frames || 0,
          t = performance.now();
        const v = ((f - f0) * 1000) / Math.max(1, t - t0);
        f0 = f;
        t0 = t;
        fps.style.color = v < 50 ? "#f2b13c" : "#e8e8e8";
        /* BOTH NUMBERS, because one of them alone means nothing. The left
         * is what the browser handed out; the right is what the scene spent
         * inside its own frame. A low rate with a small cost is a browser
         * running at half vsync — a display, a power setting, another tab —
         * and no amount of work here will move it. A cost near the budget
         * is ours. */
        const cost = window.__frameMs || 0;
        fps.style.color = cost > 9 ? "#f2b13c" : v < 50 ? "#8d8d96" : "#e8e8e8";
        fps.textContent =
          v.toFixed(0) + " fps · scene " + cost.toFixed(1) + " ms of " +
          (1000 / Math.max(v, 0.001)).toFixed(1);
      }, 500);

      for (const [group, rows] of WEB_TUNE) {
        const g = document.createElement("div");
        g.className = "g";
        g.textContent = group;
        box.appendChild(g);
        for (const [key, min, max, step, why] of rows) {
          const row = document.createElement("div");
          row.className = "r";
          const lab = document.createElement("label");
          /* The label is the key with its prefix off — but "webSpd0" would
           * come out "spd0", and three rows called spd0/1/2 say nothing about
           * which column they move. The three-web rows name their side. */
          const SIDE = { 0: "left", 1: "middle", 2: "right" };
          const NAMED = { storySecs: "telling", storyRest: "wait", storySpread: "spread", greyShare: "grey", markLogo: "mark", ptrLift: "touch", ptrSize: "touch size", webCurve: "wrap", webDome: "dome", webCurveSh: "wrap shade", webShade: "wave shade" };
          const m = /^web(Spd|Lag)([012])$/.exec(key);
          lab.textContent = m
            ? SIDE[m[2]] + (m[1] === "Lag" ? " start" : "")
            : NAMED[key] || key.replace(/^(web|ink)/, "").toLowerCase() || key;
          lab.title = why;
          const inp = document.createElement("input");
          inp.type = "range";
          inp.min = min;
          inp.max = max;
          inp.step = step;
          inp.value = P[key];
          const out = document.createElement("span");
          out.className = "v";
          const dp = /^webSpd/.test(key) ? 4 : 3;
          out.textContent = (+P[key]).toFixed(dp);
          inp.addEventListener("input", () => {
            P[key] = parseFloat(inp.value);
            out.textContent = P[key].toFixed(dp);
          });
          row.append(lab, inp, out);
          box.appendChild(row);
        }
      }

      const btn = document.createElement("button");
      btn.textContent = "copy the values";
      btn.onclick = () => {
        const txt = WEB_TUNE.map(([, rows]) =>
          rows
            .map(
              ([k]) =>
                "      " + k + ": " +
                (+P[k]).toFixed(/^webSpd/.test(k) ? 4 : 3) + ",",
            )
            .join("\n"),
        ).join("\n");
        (navigator.clipboard
          ? navigator.clipboard.writeText(txt)
          : Promise.reject()
        )
          .then(() => (btn.textContent = "copied"))
          .catch(() => console.log(txt));
        setTimeout(() => (btn.textContent = "copy the values"), 1200);
      };
      box.appendChild(btn);
      document.body.appendChild(box);
      return box;
    }

    /* --------------------------------------------------------- orientation
     * Column-major, matching the GLSL mat3 constructor exactly. The body's
     * orientation R is built here; the shader wants world -> object, which is
     * its transpose.
     */
    function m3rotY(a) {
      const c = Math.cos(a),
        s = Math.sin(a);
      return new Float32Array([c, 0, -s, 0, 1, 0, s, 0, c]);
    }
    function m3rotX(a) {
      const c = Math.cos(a),
        s = Math.sin(a);
      return new Float32Array([1, 0, 0, 0, c, s, 0, -s, c]);
    }
    const sm = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const TAU = Math.PI * 2;
    function m3rotZ(a) {
      const c = Math.cos(a),
        s = Math.sin(a);
      return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
    }
    function m3mul(a, b) {
      const o = new Float32Array(9);
      for (let c = 0; c < 3; c++)
        for (let r = 0; r < 3; r++) {
          let v = 0;
          for (let k = 0; k < 3; k++) v += a[k * 3 + r] * b[c * 3 + k];
          o[c * 3 + r] = v;
        }
      return o;
    }
    function m3t(m) {
      return new Float32Array([
        m[0],
        m[3],
        m[6],
        m[1],
        m[4],
        m[7],
        m[2],
        m[5],
        m[8],
      ]);
    }

    let gl,

      quad,
      inside,
      uq,
      ui,
      vao,
      quadVao,
      pageVao,
      pageCount = 0,
      pageTex,
      galleyTex;
    let panelTex = null,
      panelsOn = 0;
    let fbTex,
      fb,
      fw = 0,
      fh = 0;
    let canvas, section;
    // aim: where the pointer asks the face to look. drag: what the reader has
    // spun it to, plus the velocity it keeps once let go.
    let aimYaw = 0,
      aimPitch = 0,
      tYaw = 0,
      tPitch = 0;
    let dragYaw = 0,
      dragPitch = 0,
      velYaw = 0,
      velPitch = 0;
    let dragging = false,
      lastX = 0,
      lastY = 0,
      moved = 0;
    // the exit: spin up, break apart, then hold still
    // The exit is triggered, not scrubbed. Scrolling only winds the body up;
    // past a threshold it fires and the rest plays on its own clock.
    // Fourteen flat flakes, six faces each. They are built axis-aligned — a
    // thin slab with an irregular outline — and then the random rotation is
    // baked into the plane normals on the CPU, so each flake faces its own way
    // for nothing at render time. Six faces on the six axes also means the
    // solid is closed by construction; freely random planes leave an open
    // wedge, which renders as an infinite shard across the frame.
    const NSHARD = 20,
      NFACE = 6;
    // how far the camera walks back over the cards, as a share of its own distance
    let BACK_Z = 0.85;
    const AXES = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const planes = new Float32Array(NSHARD * NFACE * 4);
    const shardP = new Float32Array(NSHARD * 3);
    const shardS = new Float32Array(NSHARD);
    const shardR = new Float32Array(NSHARD);
    const shardU = new Float32Array(NSHARD * 3);
    const shardV = new Float32Array(NSHARD * 3);
    const shardW = new Float32Array(NSHARD * 3);
    // each flake keeps its own smoothed pointer, so they lag by different
    // amounts and arrive at different times
    const followX = new Float32Array(NSHARD);
    const followY = new Float32Array(NSHARD);
    const shardSeed = [];
    // how many quarter turns the plate lies at, for the shader to undo
    const spinOf = new Float32Array(NSHARD);
    // Built here rather than inline so the tuning panel can redo it when a
    // field value moves: everything downstream reads shardSeed each frame.
    function seedPlates() {
      shardSeed.length = 0;

      const rnd = (n) => {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
      };

      for (let i = 0; i < NSHARD; i++) {
        // One rotation per flake. The plate lies whichever way it likes — the
        // quarter turn is recorded and the picture inside is turned back by it,
        // so a plate on its side still carries a chart the right way up. Only
        // the leftover, under a quarter turn, is left to read as scatter. The
        // tilt swings the face away from the camera, and a panel seen edge-on
        // shows nothing, so it stays inside ±0.38 rad.
        const quarter = (rnd(i * 5 + 9) * 4) | 0;
        spinOf[i] = quarter;
        const A = quarter * 1.5708 + (rnd(i * 5 + 1) * 2 - 1) * 0.3;
        const B = (rnd(i * 5 + 2) * 2 - 1) * 0.38;
        const ca = Math.cos(A),
          sa = Math.sin(A);
        const cb = Math.cos(B),
          sb = Math.sin(B);
        // the same rotation applied to the three axes: the flake's own frame,
        // which is what the panel is sampled along
        const rot = (x0, y0, z0) => {
          const rx = x0 * ca - y0 * sa,
            ry = x0 * sa + y0 * ca;
          return [rx, ry * cb - z0 * sb, ry * sb + z0 * cb];
        };
        const U = rot(1, 0, 0),
          V = rot(0, 1, 0),
          W = rot(0, 0, 1);
        for (let k = 0; k < 3; k++) {
          shardU[i * 3 + k] = U[k];
          shardV[i * 3 + k] = V[k];
          shardW[i * 3 + k] = W[k];
        }
        let far = 0;
        // Six planes, and every one of them square to the plate's own axes: a
        // clean rectangle, no corners shaved off. The broken-glass silhouette
        // was fighting the thing it carries — a chart wants a straight edge.
        // The four side offsets differ, so the plates are still all different
        // rectangles, and the shader maps the tile from those four numbers.
        const FACES = [
          U,
          [-U[0], -U[1], -U[2]],
          V,
          [-V[0], -V[1], -V[2]],
          W,
          [-W[0], -W[1], -W[2]],
        ];
        for (let k = 0; k < NFACE; k++) {
          const s0 = i * 23 + k * 7;
          const n0 = FACES[k];
          const off =
            k < 4
              ? 0.7 + 0.32 * rnd(s0 + 4) // its own reach on that side
              : 0.04 + 0.03 * rnd(s0 + 4); // the slab's thickness
          const L = Math.hypot(n0[0], n0[1], n0[2]) || 1;
          far = Math.max(far, off);
          const o = (i * NFACE + k) * 4;
          planes[o] = n0[0] / L;
          planes[o + 1] = n0[1] / L;
          planes[o + 2] = n0[2] / L;
          planes[o + 3] = off;
        }
        /* The break does not scatter them on a sphere any more: it throws
         * each one straight to its own place in the corridor, and the corridor
         * is the layout the field keeps for good. Every plate flies out of the
         * centre — at burst 0 they are all at the origin, inside the block —
         * and lands on the slot it will then travel down.
         *
         * The slots are evenly spaced round the loop, so the field is never
         * clumped and never leaves a gap: dealt by index, the nearest slot to
         * the lens is plate 0, which is also the first to pass it and the first
         * to come back at the far end.
         */
        // The throw itself is the one it always was: Fibonacci covers the
        // sphere evenly, the hash knocks each flake off it, and the forward
        // half is compressed because a piece in front of the lens renders three
        // times the size of one behind and would swallow the field. That is the
        // motion the break reads by — the corridor is where it settles after,
        // not how it flies.
        const kk = (i + 0.5) / NSHARD;
        let dz = (1 - 2 * kk) * P.depthZ;
        dz = dz > 0 ? dz * 0.42 : dz * 0.95;
        const rr = Math.sqrt(Math.max(0, 1 - dz * dz));
        const ph = i * 2.39996;
        const dx = rr * Math.cos(ph) + (rnd(i * 7 + 1) * 2 - 1) * 0.3;
        const dy = rr * Math.sin(ph) + (rnd(i * 7 + 2) * 2 - 1) * 0.3;
        dz += (rnd(i * 7 + 3) * 2 - 1) * 0.22;
        const dl = Math.hypot(dx, dy, dz) || 1;

        const slot = (i + 0.5) / NSHARD;
        shardSeed.push({
          dir: [dx / dl, dy / dl, dz / dl],
          dist: P.spreadMin + P.spreadMax * rnd(i * 7 + 4), // some go far further
          slot: slot, // its place round the loop
          ang: i * 2.39996 + (rnd(i * 7 + 1) * 2 - 1) * 0.4,
          // How far off the axis, as a share of what the frame holds at its
          // own depth — which, once the projection is worked through, is
          // exactly its radius on screen. Held clear of the middle: the pieces
          // must come out of the page, not sit on top of it.
          frac: 0.44 + 0.66 * rnd(i * 7 + 2),
          siz: P.plateMin + P.plateMax * rnd(i * 7 + 5),
          // its own answer to the pointer: how fast it catches up, how far it
          // travels, and along which axis — one shared easing made twenty
          // flakes slide in lockstep, which reads as one object, not twenty
          ease: 1.6 + 5.6 * rnd(i * 7 + 6),
          amp: 0.55 + 0.95 * rnd(i * 7 + 7),
          skew: (rnd(i * 7 + 8) - 0.5) * 1.1,
          far: far * 1.45,
        });
      }
    }
    seedPlates();

    /* ------------------------------------------------ the endless field
     * Past the break the field stops being twenty pieces of a block and
     * becomes a space the camera travels into: the scroll advances it, the
     * plates stream toward the lens, and one that goes past comes back at the
     * far end carrying a subject it did not have before. Nothing is created
     * and nothing is destroyed — twenty plates, recycled, which is how an
     * endless canvas is built.
     *
     * The subject a plate carries is a function of a counter, and the counter
     * is its place in the queue: rank by depth, plus twenty for every lap it
     * has run. The plates in flight therefore always hold twenty CONSECUTIVE
     * counters, and the cycle is twenty subjects long — so no two plates on
     * screen can ever carry the same one, however long the field runs.
     *
     * The cycle is seven loops and thirteen stills, the loops spaced evenly
     * through it: a third of what the camera holds is moving, by construction
     * rather than by luck. The thirteen stills are drawn from the deck of
     * twenty-five with a stride of thirteen, which is coprime with it, so a
     * lap shows a different thirteen and no still can meet itself across the
     * seam of two cycles.
     */
    const CYCLE = NSHARD; // subjects before it comes round
    const LOOP_SLOT = [0, 3, 6, 9, 12, 15, 18]; // where the loops fall in it
    const slotIsLoop = new Int8Array(CYCLE).fill(-1);
    LOOP_SLOT.forEach((sl, k) => {
      slotIsLoop[sl] = k;
    });
    const stillRank = new Int8Array(CYCLE);
    for (let sl = 0, r = 0; sl < CYCLE; sl++)
      stillRank[sl] = slotIsLoop[sl] < 0 ? r++ : -1;

    // what plate number c in the queue carries: a loop, or one still of the deck
    function subjectAt(c) {
      const cyc = Math.floor(c / CYCLE);
      const sl = ((c % CYCLE) + CYCLE) % CYCLE;
      const li = slotIsLoop[sl];
      if (li >= 0) return li; // sequence li, always at this slot
      // JS gives a negative remainder for a negative left-hand side, and going
      // the other way down the corridor the counter DOES go negative: the still
      // then came back encoded positive, which reads as a loop number, which
      // reads as a tile that belongs to another subject. Two plates could land
      // on the same one that way.
      const st = (((13 * cyc + stillRank[sl]) % STILLS) + STILLS) % STILLS;
      return -1 - st; // still, encoded negative
    }
    const tileNow = new Float32Array(NSHARD);
    const subOf = new Int16Array(NSHARD); // loop number, or -1-still
    // The corridor the field runs down, in distance from the lens, and how many
    // lengths of it the whole card scroll travels.
    // Which way the field runs under the scroll. At −1 it comes at the lens
    // and the camera reads as going into the space; at +1 it withdraws and the
    // camera reads as backing out of it, plates shrinking toward the middle.
    // The near end is held further out on the way back, because a plate that
    // arrives there arrives at arm's length.
    let FLOW_DIR = -1;
    const FLOW_NEAR = 1.6,
      FLOW_FAR = 15.5,
      FLOW_LEN = FLOW_FAR - FLOW_NEAR;
    let FLOW_LAPS = 2.4;
    // The queue is the slot order: plate 0 sits nearest the lens, so it is the
    // first to go past it and the first to come back at the far end.
    const hsh = (n) => {
      const x = Math.sin(n * 91.7 + 47.3) * 28461.13;
      return x - Math.floor(x);
    };

    const order = Array.from({ length: NSHARD }, (_, i) => i);
    // the page's own follower and drift, so it is never quite still
    const pageF = { x: 0, y: 0 };
    let plateM = new Float32Array(9);
    // The wind-up's turns, kept per axis rather than as one angle scaled two
    // ways. They only ever hold 1 : 0.34, but a whole turn has to be removable
    // from each on its own — that is what lets the body come to rest without
    // spinning back through everything it wound up.
    /* Kill switches, read once from the URL. A renderer that hangs without a
     * JS loop is the GPU wedging on one of the three passes this module draws,
     * and the only way to say which is to draw two of them. Add ?noinside,
     * ?noplates or ?nopage and reproduce. */
    const OFF = {
      inside: /[?&]noinside\b/.test(location.search),
      plates: /[?&]noplates\b/.test(location.search),
      page: /[?&]nopage\b/.test(location.search),
    };
    if (OFF.inside || OFF.plates || OFF.page) {
      console.log(
        "[hero] passes coupées :",
        Object.keys(OFF).filter((k) => OFF[k]),
      );
    }
    let burst = 0,
      pack = 1,
      spinUp = 0,
      spinUpX = 0,
      spinRate = 0;
    let backEase = 0,
      shown = -1;
    // the camera's distance before the walk back, so a late plate can ride
    // forward by exactly what the camera gives up
    let zoomBase = 6.4;
    let fired = false,
      tB = 0,
      lit = false;
    // Which way the arc is being read. Latched on the last scroll that
    // actually moved, so a hold carries on in the direction it was going —
    // downward that is the break playing through, upward it is the break
    // playing back. Never inferred from a still frame.
    let lastProg = 0,
      rev = false,
      lastBack = 0,
      lastT = -9;
    // The return is not the descent run at the descent's speed: it is its own
    // move, and it is the heavier of the two. Everything the descent integrates
    // — the break, the wind-up's turns, the page coming square — is given back
    // at this multiple of the rate that built it. Below 1 the pieces drift home
    // rather than snap back; the whole return scales with it, the page coming
    // square included.
    /* The return is not a second viewing at the same pace. At 0.8 the exit
     * took 1.9 s to retract and the break 3.8 s after it — six seconds of a
     * wheel that answers nothing, which reads as a frozen page, not as a
     * rewind. Above 1 it is quicker than the descent, which is what re-reading
     * should be: the same moves, recognised rather than watched.
     */
    let RETURN = 2.6;
    // Once the pieces are back inside, the block still has a move to finish:
    // the page eases out of square and the body lets go of its compression.
    // The scroll waits for that, then goes; and the hero does not simply
    // reappear, it comes back on.
    // The trip home. Not a cut and a re-entry: the page is walked back to the
    // hero and the body rides it, so it stays the same body the whole way.
    let homeT = -1,
      homeY0 = 0,
      homeY = 0,
      spin0 = 0,
      spinX0 = 0;
    let HOME_TRIP = 0.9; // seconds the body takes to travel home
    // Where the flood runs, as a share of what is left of the arc after the
    // break. Everything after it runs on the exit's own clock, not on this.
    // The fourth card leaves on its own step, and the flood only starts once
    // it has had the same 0.75s the other three get. Started together, the
    // card was still most of the way visible when the sheet covered it — it
    // did not leave, it was buried.
    let CARD_OUT = 0.86;
    // The tumble the sheet makes on its way home, reused for the gather. It
    // is the one thing in this beat that runs on the clock and not on the
    // scroll — the page has to keep turning while the reader holds still,
    // which is the whole reason it reads as alive rather than as a pose.
    let TUMBLE = 1.15; // radians, the far end of the roll — near edge-on
    let TUMBLE_T = 2.4; // seconds of the slowest of its three rates
    // The whole exit is one fired animation on this clock — the roll, the burn,
    // the flood and the move onto the landing. The scroll fires it and nothing
    // else; scrubbed, none of it could be given a shape.
    const TUMBLE_IN = 0.35; // the roll comes up to full over this
    let BURN_AT = 0.55,
      BURN_D = 0.45; // it lights and flattens to white
    let FLOOD_AT = 0.85,
      FLOOD_D = 0.55; // it takes the frame
    // a beat of held white after the flood has finished, before the cut — at
    // exactly FLOOD_AT + FLOOD_D the move ends on the same frame it lands
    let EXIT_END = 1.55;
    let carried = false;
    // It is fired, not scrubbed. Once the last card has gone the roll runs on
    // its own clock and finishes whether the reader keeps scrolling or stops
    // dead — the same contract the break has. -1 = not running.
    let tumbT = -1;
    // #evidence's own ground. The flood lands on it exactly.
    /* The colour the sheet flattens to is, by design, the ground of the
     * section the arc hands over to — that is what makes the join not a colour
     * change at all. So it is READ from the document, like the field is: a
     * constant here and a background there are two declarations of one fact,
     * and they drift. #hero-arc carries data-wash; without it, this. */
    const WASH_C = [0.902, 0.886, 0.849];
    function readWash(el) {
      const h = el && el.dataset && el.dataset.wash;
      if (!h || !/^#[0-9a-f]{6}$/i.test(h)) return;
      for (let i = 0; i < 3; i++)
        WASH_C[i] = parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    }
    // near the top the wind rate has gone to nothing, so the unwind would
    // stall on the last few degrees: this is the floor it comes home on
    const UNWIND_MIN = 7; // rad/s
    // ÉTAPE 2 — l'éclatement est en attente : away ne dépasse jamais 1, donc
    // rien ne se déclenche. Repasser cette valeur à 0.34 le rallume.
    let FIRE = 0.82; // progress through the arc that sets it off
    let SQUASH = 0.22; // seconds of compression before the break
    let FLY = 2.8; // seconds of flight, braking the whole way
    // the plate stops following the body the moment it breaks
    let plateA = [0, 0, 0];
    /* Where the camera looks. Off to the right and a touch up, because the
     * block had to sit clear of the hero's headline. The paper section has its
     * own contents in the middle of the frame, so there the webs are centred:
     * pushed right they left a bare band down the left and cut a column off
     * against the right edge. */
    let centre = ARC0 ? [0.3, 0.06] : [0, 0],
      presence = 1,
      scale = 0.9; // reset from the
    // canvas on first resize: a fixed start is either wasteful on a small
    // window or a stall on a large one
    let slow = 0,
      fast = 0,
      sized = false;
    const reduced =
      matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let clock = 0;
    // The intro: the body arrives small and spinning, like something still
    // loading, then settles into place before any type appears. Both curves
    // end exactly at rest, so nothing snaps when the page hands over.
    let intro = 0;
    // The share of the arc the wind-up and break own. It is what sets how far
    // the reader scrolls on a turning body and nothing else, once the hero's
    // type has gone: at 0.30 that stretch was two thirds of a screen.
    let WIND_SPAN = 0.2;
    let IN_HOLD = 1.9; // seconds spinning small, as a loader would
    let IN_DONE = 3.1; // seconds until it is full size and still
    const IN_MIN = 0.085; // how small it starts, as a fraction of full size
    // It tumbles on all three axes at rates that do not divide into each other,
    // so the turn never repeats. Each angle is written as TURNS·TAU·(p-1) with
    // p going 0 to 1, which lands every axis on exactly zero however many turns
    // it was given — the body ends square on, not wherever the clock left it.
    const IN_TURNS = [3.0, 1.85, 2.4]; // yaw, pitch, roll
    const IN_INTEGRAL = IN_HOLD + (IN_DONE - IN_HOLD) / 2;

    // aim at roughly two and a half million shaded pixels to begin with, then
    // let the controller find the real number
    function startScale(cw, ch) {
      return Math.max(
        0.42,
        Math.min(1, Math.sqrt(2.5e6 / Math.max(1, cw * ch))),
      );
    }

    function sizeBuffer(w, h) {
      if (w === fw && h === fh) return;
      fw = w;
      fh = h;
      gl.bindTexture(gl.TEXTURE_2D, fbTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }

    /* WHERE THE WEBS ARE DRAWN.
     *
     * The arc when it is in the document: the hero and the chapter it breaks
     * into, measured as one, because owning only the hero would hand the
     * canvas away mid-explosion.
     *
     * When it is not — it has been lifted out — the webs still have work: they
     * are the ground of the paper section that took its place. There they run
     * and nothing else does. No wind, no break, no field of plates, no glass
     * to stand inside: those are the arc's second act, and the section has its
     * own contents to carry. */
    const ARC = !!document.querySelector("#hero-arc");
    const WEBS_ONLY = !ARC;
    /* AND THE SECOND ACT IS OPT-IN, on the arc's own element. The wind-up,
     * the break and the field of plates were choreography for four tiles
     * coming up the page, and the section under the hero does something else
     * now — so they are off unless the arc asks for them by name. Inferred
     * from the presence of a tile it would come back on by accident the day
     * that section has tiles again for a different reason, which is exactly
     * the kind of coupling that makes a page behave differently for no
     * visible cause. The exit flood is NOT part of this: the page cues that
     * one by hand, and it is what carries the ground into the section
     * below. */
    const ARC_ACT = ARC &&
      document.querySelector("#hero-arc").dataset.act === "break";

    return {
      name: "hero",
      section: ARC ? "#hero-arc" : "#proof",
      field: ground,

      /* The exit keeps the frame until it is finished. It floods the journal
       * into the ground of the section below, so the moment that section takes
       * the canvas on coverage the flood stops advancing — and the white it
       * was painting arrives all at once instead. It is the same frame either
       * way, the same white; only the passage is lost. Held both ways: read
       * backward the retraction needs the frame for exactly as long. */
      hold: () =>
        (tumbT >= 0 && tumbT < EXIT_END) ||
        (outSec > 0.001 && outSec < OUT_SPAN),

      init(api) {
        gl = api.gl;
        canvas = api.canvas;
        // No arrival. The body used to assemble over three seconds — small,
        // spinning, growing into place — and that reads as a page still
        // loading rather than as a page that has something to say. It stands
        // where it belongs from the first frame; the timeline is kept because
        // the break still walks the same orientation back.
        intro = IN_DONE;
        inside = api.program(VS, GLASS);
        quad = api.program(QUAD_VS, QUAD_FS);
        uq = api.uniforms(quad, [
          "uC",
          "uAx",
          "uAy",
          "uAz",
          "uBend",
          "uT",
          "uRes",
          "uCentre",
          "uZoom",
          "uTex",
          "uTile",
          "uTiles",
          "uAlpha",
          "uLift",
          "uSpin",
          "uBG",
          "uRoom",
          "uExposure",
          "uPresence",
          "uWash",
          "uWashC",
          "uWin",
          "uPtr",
          "uPtrK",
          "uEdge",
          "uShade",
          "uCurve",
          "uInkC",
        ]);
        ui = api.uniforms(inside, [
          "uTex",
          "uBG",
          "uAmt",
          "uAspect",
          "uBend",
          "uDisp",
          "uRim",
          "uT",
          "uAmp",
          "uFreq",
          "uSpeed",
          "uBand",
          "uSheen",
          "uCentre",
          "uSpin",
        ]);

        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        );
        for (const p of [inside]) {
          const al = gl.getAttribLocation(p, "p");
          if (al >= 0) {
            gl.enableVertexAttribArray(al);
            gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
          }
        }
        gl.bindVertexArray(null);

        quadVao = gl.createVertexArray();
        gl.bindVertexArray(quadVao);
        const qb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, qb);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        {
          const al = gl.getAttribLocation(quad, "p");
          gl.enableVertexAttribArray(al);
          gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
        }
        gl.bindVertexArray(null);

        // the sheet, subdivided enough to bend smoothly
        {
          const N = 22,
            pos = [],
            idx = [];
          for (let y = 0; y <= N; y++)
            for (let x = 0; x <= N; x++)
              pos.push((x / N) * 2 - 1, (y / N) * 2 - 1);
          for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
              const a = y * (N + 1) + x;
              idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
            }
          pageCount = idx.length;
          pageVao = gl.createVertexArray();
          gl.bindVertexArray(pageVao);
          const pb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, pb);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
          const al = gl.getAttribLocation(quad, "p");
          gl.enableVertexAttribArray(al);
          gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
          const ib = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
          gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(idx),
            gl.STATIC_DRAW,
          );
          gl.bindVertexArray(null);
        }

        pageTex = api.texFromCanvas(buildPage());
        /* The galley cannot go through texFromCanvas: that helper clamps both
         * axes, and a web scrolls for ever — v has to REPEAT or the paper
         * stops at the end of the lap and smears its last row down the rest of
         * the column. u stays clamped, which is what keeps one column of the
         * atlas out of its neighbour. */
        /* Composed and uploaded twice: once now, with drawn plates, so the
         * webs are running before anything has been over the network, and
         * again once the photographs have arrived. The hero therefore never
         * waits on Wikimedia, and if a plate never comes — or the CORS header
         * that lets a canvas carrying it be uploaded at all ever goes away —
         * the first upload is simply the one that stands. */
        const uploadGalley = () => {
          gl.bindTexture(gl.TEXTURE_2D, galleyTex);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            buildGalley(),
          );
        };
        galleyTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, galleyTex);
        /* NO MIPMAP CHAIN. The webs magnify the reel — the sheet is a third
         * of the frame wide and the column behind it is four hundred units
         * — so the minified levels were never sampled, while rebuilding them
         * cost a pass over the whole sheet on every frame a page wrote back
         * to it. A linear filter is the whole of what is used. */
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // u clamps so a column cannot bleed into the one set beside it; v
        // repeats, because a web scrolls for ever
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        uploadGalley();
        /* THE ONE SIGNAL THE PAGE CAN WAIT ON. Not "the script ran" and not
         * "a frame was drawn" — the reel exists and is on the card, which is
         * the moment there is something to show. The boot screen holds until
         * this, and nothing else in the module publishes anything. */
        window.__heroReady = true;
        loadPressImages(uploadGalley);
        /* AWAY BY DEFAULT. It covers the top right of the frame, which is
         * where a web runs, so the ordinary state of the page is the paper
         * with nothing over it. The tab in the corner brings it back without
         * a reload; ?tune opens it on load, for a session spent tuning. */
        if (!window.__noTuner) {
          const panel = buildWebTuner();
          if (!/[?&]tune\b/.test(location.search)) {
            panel.style.display = "none";
            const t = document.getElementById("web-tune-tab");
            if (t) t.style.display = "block";
          }
        }
        // Painting twenty-five charts and mipmapping the result is tens of
        // milliseconds. Done on the first frame it can make the compositor drop
        // the page to 30Hz for the rest of the session — which is the "30 from
        // the start, on the cube" that has nothing to do with the cube. The
        // panels are not needed until the break, so they are built once the
        // page is already running.
        const buildAtlas = () => {
          /* The sheet is KEPT, not thrown away with the upload: the reel's
           * modern pages read tiles straight off it. And the galley is
           * composed again once it exists — until then those pages carry
           * their head and nothing under it, the same two-pass arrangement
           * the photographs use. */
          panelSheet = paintPanels();
          panelTex = api.texFromCanvas(panelSheet);
          panelsOn = 1;
          uploadGalley();
        };
        if (window.requestIdleCallback)
          requestIdleCallback(buildAtlas, { timeout: 2500 });
        else setTimeout(buildAtlas, 900);

        fbTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fbTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          fbTex,
          0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (!document.getElementById("gl-css")) {
          const st = document.createElement("style");
          st.id = "gl-css";
          st.textContent =
            ".gl-replaced{visibility:hidden!important}" +
            ".gl-field{background:transparent!important}";
          document.head.appendChild(st);
        }
        section = document.querySelector(ARC ? "#hero" : "#proof");
        // the fixed stage carries the ground now; neither section paints it
        if (section) section.classList.add("gl-field");
        const chap = document.querySelector("#chapter");
        if (chap) chap.classList.add("gl-field");

        /* ------------------------------------------------------- the pointer
         * At rest the page faces the reader. The pointer aims it: the face
         * turns toward the cursor, so dead centre is square on and every edge
         * of the window tips it that way. A drag overrides the aim and spins
         * the body freely, keeping its velocity when released; both decay back
         * toward square so the page never parks somewhere unreadable.
         */

        addEventListener("pointermove", (e) => {
          aimYaw = (e.clientX / innerWidth - 0.5) * P.aimYaw;
          aimPitch = (e.clientY / innerHeight - 0.5) * P.aimPitch;
          if (!dragging) return;
          const dx = e.clientX - lastX,
            dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          dragYaw += dx * P.drag;
          dragPitch += dy * P.drag;
          velYaw = dx * P.drag;
          velPitch = dy * P.drag;
        });
        addEventListener("pointerdown", (e) => {
          if (!section) return;
          const r = section.getBoundingClientRect();
          if (e.clientY < r.top || e.clientY > r.bottom) return;
          if (e.target && e.target.closest && e.target.closest("a,button"))
            return;
          dragging = true;
          moved = 0;
          lastX = e.clientX;
          lastY = e.clientY;
          velYaw = velPitch = 0;
        });
        const release = () => {
          dragging = false;
        };
        addEventListener("pointerup", release);
        addEventListener("pointercancel", release);
      },

      resize(w) {
        const wide = w >= 900;
        centre = wide ? [0.3, 0.06] : [0.0, 0.1];
        P.zoom = wide ? 6.2 : 7.4;
        // over a narrow hero the type sits on top of the body, so it recedes
        presence = wide ? 1.0 : 0.62;
      },

      frame(ctx) {
        clock += reduced ? 0 : ctx.dt;
        ptrStep(Math.min(0.1, ctx.dt));
        /* The page says when the mark has gone. A page that has no boot
         * screen at all never would — and waiting for a signal nobody is
         * going to send is a web that never arrives — so the absence of the
         * screen IS the signal, checked once. */
        if (bootAt === null) {
          if (window.__bootDone) bootAt = clock;
          else if (!document.getElementById("boot")) bootAt = 0;
        }
        /* THE PAGE ASKS, AND ASKS AGAIN FOR THEM BACK. One number, run
         * forward while the page wants the paper out and backward when it
         * wants it in, so the return is the same move read the other way
         * rather than a second animation that resembles it. The page waits on
         * __webOutK instead of on a duration it would have to guess. */
        outSec = Math.max(
          0,
          Math.min(OUT_SPAN, outSec + (window.__webOut ? ctx.dt : -ctx.dt)),
        );
        window.__webOutK = outSec / OUT_SPAN;

        // adaptive resolution: this march cannot hold sixty frames at native
        // It drops fast when frames are late and climbs back quickly when they
        // are not. The old ceiling of 0.75 meant the scene never once rendered
        // at native resolution, however much headroom there was — everything
        // was permanently resampled up, which is the pixelation.
        if (ctx.dt > 0.019) {
          slow++;
          fast = 0;
        } else if (ctx.dt < 0.0135) {
          fast++;
          slow = 0;
        }
        if (slow > 10) {
          scale = Math.max(0.34, scale - 0.08);
          slow = 0;
        }
        if (fast > 40) {
          scale = Math.min(1.0, scale + 0.04);
          fast = 0;
        }

        readGround(section);
        readWash(document.querySelector("#hero-arc"));

        // how far the hero has scrolled away, 0 at rest, 1 one screen later
        const rect = section ? section.getBoundingClientRect() : null;
        const away = rect
          ? Math.min(1, Math.max(0, -rect.top / innerHeight))
          : 0;
        // Winding up: the scroll sets the rate, not the angle, so the body
        // turns by itself and only turns faster the further down you go.
        // The wind-up runs over the whole arc — hero plus the section under it —
        // so the compression only bottoms out at the end of that scroll, not
        // when the hero has merely left.
        const wind = ARC_ACT ? Math.min(1, ctx.prog / WIND_SPAN) : 0;
        // what is left of the arc, once the break has had its share: the cards
        // come in over this, and the camera walks back over it too
        const back = ARC_ACT
          ? Math.max(0, ctx.prog - WIND_SPAN) / (1 - WIND_SPAN)
          : 0;
        // This module only runs while it owns the canvas, so after a spell
        // away its last reading is from wherever the reader left it — often a
        // whole section back. A delta taken across that gap is meaningless and
        // was latching the direction to whatever it had been on the way down.
        const gap = ctx.t - lastT > 0.25;
        lastT = ctx.t;
        if (gap) {
          lastProg = scrollY;
          lastBack = back;
        }
        // Read off scrollY and not off prog. prog is clamped to 0..1 over this
        // section, so once the reader is past its end it saturates: coming back
        // up, a whole screen of scrolling produced a delta of exactly zero, the
        // direction never flipped, and the exit sat at its end painting a white
        // frame for the entire climb. scrollY always moves.
        const dp = scrollY - lastProg;
        lastProg = scrollY;
        if (!gap) {
          if (dp > 0.5) rev = false;
          else if (dp < -0.5) rev = true;
        }
        // The return trip knows which way it is going; inferring it from the
        // first delta after the jump leaves tumbT pinned at its end for as long
        // as the reader holds still, which is a white frame over the whole arc.
        if (window.__rewind) {
          rev = true;
          window.__rewind = 0;
        }
        /* The last beat of the chapter. Once the fourth card has gone the page
         * is the only thing left to look at, so it takes the frame: it gathers,
         * it lights and flattens to one colour, then it grows past the edges —
         * in that order, because grown at the rate it whitens the middle of the
         * move is a wall of legible body text. What it flattens to is the ground
         * the next section stands on, so the join is not a colour change at all.
         *
         * It runs on the clock from there, backwards at the return's rate when
         * the arc is read upward, so the exit undoes itself the way the break
         * does. And it fires on the CROSSING, not on the value: re-entering the
         * arc from underneath lands on back = 1, which satisfies the threshold
         * on its own and played the whole exit forward again while the reader
         * was going up.
         */
        /* The cue is normally the crossing itself, but a page that drives its
         * own transitions needs to say when: window.__exit = 0 means "the
         * crossing is not the cue, I will tell you", and 1 is the cue. Left
         * undefined the arc fires on its own crossing, as it always did. */
        if (window.__exit === 1) {
          window.__exit = 0;
          if (tumbT < 0) {
            tumbT = 0;
            carried = false;
          }
        } else if (
          window.__exit !== 0 &&
          !rev &&
          !gap &&
          lastBack < CARD_OUT &&
          back >= CARD_OUT &&
          tumbT < 0
        ) {
          tumbT = 0;
          carried = false;
        }
        lastBack = back;
        if (tumbT >= 0) {
          /* Same rule as the break, for the same reason. Read upward the exit
           * held nothing back, so it began retracting at the boundary between
           * the white section and the arc — where two things go wrong at once.
           * The white section is opaque over the canvas, so the retraction is
           * invisible there; and the two sections trade the canvas back and
           * forth in Stage's arbitration, so the module flickers in and out of
           * running. A lock asserted from a frame loop that keeps stopping is
           * a lock that stutters: held, lapsed after 200 ms, the banked
           * impulses carry the reader back in, held again. That is the freeze.
           * It waits until the reader is genuinely back among the tiles, where
           * the arc owns the frame and the retraction can be seen.
           */
          /* Not a position on the arc — a share of the frame. Gated on
           * back < CARD_OUT the retraction only opened 1300 px further up:
           * the reader climbed all that way looking at a white frame that
           * answered nothing, which reads exactly like a crashed page. It
           * starts the moment the arc owns the frame, which is the moment
           * there is anything to see.
           */
          const exitMine = !rev || (ctx.cover || 0) > 0.5;
          tumbT += ctx.dt * (exitMine ? (rev ? -RETURN : 1) : 0);
          if (tumbT > EXIT_END) tumbT = EXIT_END;
          // NOT carried = false here. Released on the rewind, any downward
          // jitter — and an inertial wheel makes one every time — ran the exit
          // forward again and fired the outward trip, which the return trip
          // then answered. The two carried the page back and forth until it
          // locked. It is released where it is armed: on a crossing.
          if (tumbT <= 0) tumbT = back < CARD_OUT ? -1 : 0;
        }
        // diagnostic: the exit's whole state in one place, so a console can
        // read what the closure otherwise keeps to itself
        window.__hero = {
          prog: ctx.prog,
          back: back,
          tB: tB,
          tumbT: tumbT,
          rev: rev,
          carried: carried,
          homeT: homeT,
        };
        /* The page belongs to whichever beat is playing. Asserted from the
         * state every frame rather than paired hold/release calls, so a beat
         * cannot leave a lock behind it: the moment its condition is false the
         * name is lifted. Read downward it holds until the beat lands; read
         * upward it holds until the beat has come all the way back.
         */
        if (typeof Scroll !== "undefined") {
          const g = (tag, on) => (on ? Scroll.hold(tag) : Scroll.release(tag));
          g("intro", intro < IN_DONE);
          // A lock is only ever taken on a beat that can actually advance.
          // Read upward tB is frozen until back <= 0, so without that same
          // condition here the page was held for a beat that could not move:
          // the watchdog kept prising it open and the frame loop kept taking
          // it back, forever.
          g(
            "break",
            fired && (rev ? back <= 0 && tB > 0.02 : tB < SQUASH + FLY),
          );
          // Downward only. Read upward this beat is a flat colour filling the
          // frame — the sheet is 22x its own size and fully washed, and the
          // one legible moment lives in its last few per cent. Holding the
          // reader on that is a second of blank screen that answers nothing,
          // which is what kept being reported as a crash. It still rewinds,
          // it just does not take the page hostage to do it.
          g("exit", tumbT >= 0 && !rev && tumbT < EXIT_END);
        }
        const cond = tumbT < 0 ? 0 : sm(0, TUMBLE_IN, tumbT);
        const washC = tumbT < 0 ? 0 : sm(BURN_AT, BURN_AT + BURN_D, tumbT);
        const washG = tumbT < 0 ? 0 : sm(FLOOD_AT, FLOOD_AT + FLOOD_D, tumbT);
        const way = rev ? -RETURN : 1;

        if (!fired) {
          spinRate = wind * wind * 52; // it winds up, and winds up fast
          if (!rev && wind > FIRE) {
            fired = true;
            tB = 0;
          }
        } else {
          /* The break belongs to the top of the arc, and read upward it must
           * not begin to come apart while the reader is merely walking back
           * through the tiles. Gated on direction alone, tB reached zero in
           * the middle of the chapter, homeT started, and the page was carried
           * off to the hero from wherever they happened to be. It only rewinds
           * once they are back above the tiles altogether — back <= 0 is
           * exactly "before the first one".
           */
          const mine = !rev || back <= 0;
          tB += ctx.dt * (mine ? way : 0);
          // Nothing reads past the end of the flight, but an unbounded tB made
          // the return as long as the stay: sit at the bottom for half a minute
          // and the pieces took half a minute to come home. The break has a
          // length, and it is this one.
          if (tB > SQUASH + FLY) tB = SQUASH + FLY;
          // The pieces are back inside. From here the body takes itself home
          // rather than the wind-up being played a second time backwards.
          if (tB <= 0) {
            tB = 0;
            if (homeT < 0) {
              homeT = 0;
              homeY0 = homeY = scrollY;
              spin0 = spinUp;
              spinX0 = spinUpX;
            }
          }
          spinRate *= Math.exp(-ctx.dt * 2.4); // the spin dies with the break
        }
        if (wind < 0.02 && fired && homeT < 0) {
          fired = false;
          tB = 0;
          spinUp = spinUpX = 0;
          lit = false;
        }
        const spinD =
          ctx.dt * (rev ? -Math.max(spinRate, UNWIND_MIN) * RETURN : spinRate);
        // same rule for the wind-up's turns: unwound while the reader was
        // still among the tiles, the block came back square out of nowhere the
        // moment the pieces returned
        spinUp += rev && back > 0 ? 0 : spinD;
        spinUpX += rev && back > 0 ? 0 : spinD * 0.34;
        if (spinUp < 0) {
          spinUp = 0;
          spinUpX = 0;
        }

        // The trip home. The page is eased back to the hero and the body rides
        // it: same body, same size growing back out of the same slot, no cut.
        // It is off the moment the reader steers — down again, or by taking
        // the scroll back by hand.
        if (homeT >= 0 && (!rev || Math.abs(scrollY - homeY) > 2)) homeT = -1;
        if (homeT >= 0) {
          homeT += ctx.dt;
          const hu = Math.min(1, homeT / Math.max(0.05, HOME_TRIP));
          const hk = hu * hu * (3 - 2 * hu);
          const arc = document.querySelector("#hero-arc");
          const dest = arc ? arc.offsetTop : 0;
          homeY = Math.round(homeY0 + (dest - homeY0) * hk);
          scrollTo(0, homeY);
          // and it comes to rest as it travels: each axis to the nearest whole
          // turn, which is under half a turn away and is the orientation it
          // already has. It glides home rather than spinning home.
          spinUp = spin0 + (TAU * Math.round(spin0 / TAU) - spin0) * hk;
          spinUpX = spinX0 + (TAU * Math.round(spinX0 / TAU) - spinX0) * hk;
          if (hu >= 1) {
            // arrived. Whole turns are the orientation it stands in, so this
            // costs nothing to look at.
            homeT = -1;
            fired = false;
            tB = 0;
            spinUp = spinUpX = 0;
            spinRate = 0;
            backEase = 0;
            lit = false;
            shown = -1;
            const chap0 = document.querySelector("#chapter");
            if (chap0) chap0.classList.remove("lit", "s1", "s2", "s3", "s4");
          }
        }
        backEase += (back * back * (3 - 2 * back) - backEase) * 0.08;

        // It tightens as it spins, and it does not let go before it goes: the
        // compression is carried through the breath and through the break, so
        // the pieces leave a body that is still tight. uPack is a plain scale
        // on the body (q/uPack … * uPack), so any step in it is the block
        // changing size in one frame — the branches have to meet.
        const packW = 1 - 0.66 * Math.pow(wind, 1.35);
        if (!fired) {
          pack = packW;
          burst = 0;
        } else if (tB < SQUASH) {
          pack = packW * (1 - 0.17 * Math.sin((tB / SQUASH) * Math.PI));
          burst = 0; // one more breath in, from
        } else {
          // wherever the wind-up left it
          pack = packW;
          const u = Math.min(1, (tB - SQUASH) / FLY);
          burst = 1 - Math.pow(1 - u, 5); // flies out, then all but stops
        }
        // the paper section wants the webs and nothing after them
        if (WEBS_ONLY || !ARC_ACT) burst = 0;

        // the section's own interface waits for the field to settle
        const chap = document.querySelector("#chapter");
        if (chap) {
          const done = fired && tB > SQUASH + FLY * 0.42;
          if (done !== lit) {
            lit = done;
            chap.classList.toggle("lit", done);
          }
          // one card per step of what is left of the arc, in order
          const step =
            back < 0.06
              ? 0
              : back < 0.28
                ? 1
                : back < 0.5
                  ? 2
                  : back < 0.72
                    ? 3
                    : back < CARD_OUT
                      ? 4
                      : 5;
          if (step !== shown) {
            shown = step;
            for (let k = 1; k <= 5; k++)
              chap.classList.toggle("s" + k, step >= k);
          }
        }

        // Arrived: the frame is one flat colour and the section under it is the
        // same colour, so the page can be put on the landing without anything
        // showing. Nothing eases here — there is no visible edge to ease.
        // Stamped, not flagged: this module only runs while it owns the
        // canvas, so a boolean left behind reads as "still running" forever
        // and blocks the landing from ever arming itself again.
        if (tumbT >= 0) window.__exitAt = performance.now();
        const settled = performance.now() - (window.__carryAt || 0) > 420;
        if (!carried && settled && tumbT >= EXIT_END) {
          carried = true;
          window.__carryAt = performance.now();
          const w = document.querySelector("#white");
          if (w) {
            // where on the arc the exit finished, so the return can come back
            // to exactly this point and play it backwards from there
            window.__exitProg = ctx.prog;
            window.__handed = 0; // the return is armed again by the outward trip
            scrollTo(0, w.offsetTop);
            // and the section's own entrance starts on this frame, not on a
            // scroll threshold it would have crossed behind the flood
            w.classList.add("on");
          }
        }
        // rewound past the exit, the landing is armed again
        if (tumbT < 0) {
          const w0 = document.querySelector("#white");
          if (w0) w0.classList.remove("on");
        }

        // the interface leaves on the scroll, ahead of the break

        if (section) {
          const out = away * innerHeight * 0.55;
          const fade = Math.max(0, 1 - away * 2.1);
          const h1 = section.querySelector("h1");
          if (h1) {
            h1.style.transform =
              "translateY(calc(-50% - " + out.toFixed(1) + "px))";
            h1.style.opacity = fade;
          }
          const foot = section.querySelector("h1 ~ div");
          if (foot) {
            foot.style.transform =
              "translateY(" + (-out * 1.35).toFixed(1) + "px)";
            foot.style.opacity = fade;
          }
        }

        intro += reduced ? IN_DONE : ctx.dt;
        const tg = Math.min(
          1,
          Math.max(0, (intro - IN_HOLD) / (IN_DONE - IN_HOLD)),
        );
        const grow = IN_MIN + (1 - IN_MIN) * (tg * tg * (3 - 2 * tg));
        // steady while it is small, then braking linearly as it grows
        const swept =
          intro < IN_HOLD
            ? intro
            : IN_HOLD + (IN_DONE - IN_HOLD) * (tg - (tg * tg) / 2);
        const p = Math.min(1, swept / IN_INTEGRAL) - 1;
        const spinY = IN_TURNS[0] * 2 * Math.PI * p;
        const spinX = IN_TURNS[1] * 2 * Math.PI * p;
        const spinZ = IN_TURNS[2] * 2 * Math.PI * p;

        // The document places the body: an element carrying data-glass marks
        // the box it should fill, and the camera is derived from that rect. The
        // layout then balances in CSS like anything else, instead of the scene
        // and the type being aligned by hand against each other.
        let zoom = P.zoom;
        const slot = section && section.querySelector("[data-glass]");
        if (slot) {
          const r = slot.getBoundingClientRect();
          if (r.height > 20) {
            centre = [
              (r.left + r.width / 2 - innerWidth / 2) / innerHeight,
              (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight,
            ];
            // a ray at uv u meets the body's plane at u*zoom/2.05 world units,
            // and the body reaches ~0.86 of those, so this makes it fill r
            zoom = (3.53 * innerHeight) / (r.height * grow);
            zoom *= 1 + 0.95 * burst; // widen as the pieces spread
            // and keeps walking back while the cards come in: the field pulls
            // away into the depth instead of standing still behind them
            // the camera holds still; what the scroll moves is the field
            // data-glass scrolls away with the hero, and the body must not go
            // with it: as soon as the page moves, it slides to the middle of
            // the window and stays there.
            const pull = sm(0.0, 0.3, away);
            centre[0] *= 1 - pull;
            centre[1] *= 1 - pull;
          }
        }

        const cw = canvas.width,
          ch = canvas.height;
        if (!sized) {
          scale = startScale(cw, ch);
          sized = true;
        }
        // MARCH is the raymarched glass, QUADS the rasterised plates seen from
        // inside it. They cost nothing alike, and a slow frame on one says
        // nothing about the other.
        /* Nothing marches any more. The hero was a block of glass and the
         * marcher was how it existed; the hero is now three webs of paper,
         * which are geometry. Kept as a constant rather than deleted on the
         * spot so the passes that ask "is the block still whole?" — the
         * buffer's resolution, the glass wall past the break — keep reading
         * the same answer they always did. */
        /* The webs' geometry, worked out before anything is placed, because
         * the plates are anchored to it. What the camera sees at the webs'
         * depth is taken off the vertex shader rather than guessed at: it
         * projects clip.y = (P.y * 2.05 / d) * 2, so the edge of the frame is
         * at P.y = d/4.1, and x is stretched by the aspect on the way. */
        const webDZ = Math.max(0.25, zoom);
        const webNH = webDZ / 4.1,
          webNW = webNH * (cw / Math.max(1, ch));
        const webHW = webNW * P.webW,
          webHH = webNH * P.webH;
        const WEB_ROWS = Math.ceil(NSHARD / 3);
        window.__glPath = "QUADS";
        // the marcher traces into a fraction of the canvas and is stretched
        // back up; the plates are drawn at full size, because they are type and
        // hairlines and resampling them is what reads as pixelation
        sizeBuffer(
          cw,
          ch,
        );

        // the aim eases in; the drag coasts, damps, and relaxes back to square
        tYaw += (aimYaw - tYaw) * 0.07;
        tPitch += (aimPitch - tPitch) * 0.07;
        if (!dragging) {
          dragYaw += velYaw;
          dragPitch += velPitch;
          velYaw *= P.damp;
          velPitch *= P.damp;
          if (Math.abs(velYaw) < 1e-4) velYaw = 0;
          if (Math.abs(velPitch) < 1e-4) velPitch = 0;
          dragYaw *= 1 - P.relax;
          dragPitch *= 1 - P.relax;
        }
        const idleY = Math.sin(clock * 0.23) * P.idle;
        const idleX = Math.sin(clock * 0.31) * P.idle * 0.6;
        // the pointer only takes over once the intro has settled
        const still = 1 - burst; // the idle and the aim fade out with it
        const ay = dragYaw + spinY + spinUp + (tYaw + idleY) * tg * still;
        const ax = dragPitch + spinX + spinUpX + (tPitch + idleX * still) * tg;
        const az = spinZ;
        if (burst < 0.001 && homeT < 0) {
          // wrapped to the short way round, so releasing it does not send the
          // page spinning through every turn the body had built up
          const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
          plateA = [wrap(ay), wrap(ax), wrap(az)];
        } else if (rev || homeT >= 0) {
          // read backwards, it comes back out of square as the pieces come
          // home: the same move as the settling, aimed the other way
          const k = 1 - Math.exp(-ctx.dt * 2.2 * RETURN);
          const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
          const t = [wrap(ay), wrap(ax), wrap(az)];
          plateA = [
            plateA[0] + (t[0] - plateA[0]) * k,
            plateA[1] + (t[1] - plateA[1]) * k,
            plateA[2] + (t[2] - plateA[2]) * k,
          ];
        } else {
          // Settling square is a relax toward zero; the gather before the white
          // is the same relax toward the body's own angle. Here the target is
          // the roll the page makes coming home on the reverse scroll: it keeps
          // turning rather than tipping once and holding, on two rates that do
          // not divide into each other so it never reads as a metronome, and
          // bounded short of a half turn so the reader never gets the back of
          // the page. It winds down to square as the flood takes over, because
          // a sheet that has to cover the frame has to face the reader.
          // Its own clock: the scroll only fires it and, at the far end, puts
          // it away — a sheet that has to cover the frame has to face the
          // reader, so the flood is still what flattens it.
          /* Off well before the sheet is large, not in proportion to the
           * flood. Tied to (1 - washG) the roll came back as the flood
           * receded, and a sheet nine times its own size tilted sixty degrees
           * is a white slab lying diagonally across the frame — which is what
           * the retraction actually looked like.
           */
          const turn = cond * (1 - sm(0, 0.12, washG));
          // Three rates that do not divide into each other, summing to one, so
          // the amplitude stays bounded short of a half turn while the path
          // never repeats. Pitch leads — in the reference the sheet goes short
          // and wide, which is the horizontal axis. A little in-plane roll on
          // top, which is what stops it reading as a hinge.
          const w = clock * (TAU / Math.max(0.2, TUMBLE_T));
          const turb = (o) =>
            Math.sin(w + o) * 0.62 +
            Math.sin(w * 2.31 + o * 1.7 + 1.3) * 0.27 +
            Math.sin(w * 4.17 + o * 2.9 + 4.1) * 0.11;
          const t = [
            turb(0.0) * TUMBLE * 0.95 * turn,
            turb(2.1) * TUMBLE * 0.8 * turn,
            turb(4.3) * TUMBLE * 0.35 * turn,
          ];
          // 2.2 a second damps the 4.17× component almost out of existence, so
          // the roll gets a faster follow than the settle does
          const k = 1 - Math.exp(-ctx.dt * (turn > 0 ? 7.0 : 2.2));
          plateA = [
            plateA[0] + (t[0] - plateA[0]) * k,
            plateA[1] + (t[1] - plateA[1]) * k,
            plateA[2] + (t[2] - plateA[2]) * k,
          ];
        }
        const orient = m3t(m3mul(m3mul(m3rotY(ay), m3rotX(ax)), m3rotZ(az)));
        // Released, the page keeps moving: a slow breath on all three axes and
        // its own lagged answer to the pointer, softer and later than any of
        // the plates. A subject that holds perfectly still reads as pasted on.
        pageF.x +=
          (aimYaw / P.aimYaw - pageF.x) * (1 - Math.exp(-1.1 * ctx.dt));
        pageF.y +=
          (aimPitch / P.aimPitch - pageF.y) * (1 - Math.exp(-1.1 * ctx.dt));
        // the drift is fine on a sheet the size of a sheet; on one that fills
        // the frame it is the whole picture sliding, so it goes with the flood
        const live = burst * (1 - Math.max(cond, washC));
        // Where the page is, exactly. The break has to come out of it, so the
        // plates leave from this point rather than from the origin — the page
        // drifts, and a burst centred on the origin leaves from beside it.
        const pageC = [
          (Math.sin(clock * 0.43) * 0.085 + pageF.x * 0.1) * live,
          (Math.sin(clock * 0.37 + 2.1) * 0.07 + pageF.y * 0.07) * live,
          Math.sin(clock * 0.29 + 1.2) * 0.09 * live,
        ];
        const plate = m3t(
          m3mul(
            m3mul(
              // Periods of a few seconds, not twenty. At 0.31 rad/s it took
              // five seconds to travel from centre to extreme, which the eye
              // reads as a still image however much it is technically moving.
              m3rotY(
                plateA[0] +
                  (Math.sin(clock * 0.95) * 0.1 + pageF.x * 0.34) * live,
              ),
              m3rotX(
                plateA[1] +
                  (Math.sin(clock * 0.71 + 1.7) * 0.075 + pageF.y * 0.24) *
                    live,
              ),
            ),
            m3rotZ(plateA[2] + Math.sin(clock * 0.54 + 0.6) * 0.055 * live),
          ),
        );
        // the quad pass needs this too, and it kept the orientation it had at
        // the break for as long as the assignment sat inside the marcher's
        // branch — which is why the page came out upside down
        plateM = plate;

        // the body sinks a little as the hero scrolls away
        const r = section ? section.getBoundingClientRect() : null;

        // Where every plate is. This has to run whether or not the marcher
        // does — it lived inside that branch for one build, and the plates all
        // collapsed to the origin at zero size the moment it was skipped.
        let fieldR = 0;
        const aspNow = Math.max(0.9, innerWidth / Math.max(1, innerHeight));
        const travel = FLOW_LEN * FLOW_LAPS * backEase;
        // The break throws them out; the corridor is what they settle into once
        // the cards start. Two different things, so they are two positions and
        // the field eases from one to the other rather than the throw being
        // aimed at the corridor and losing its own motion.
        const st = Math.max(0, Math.min(1, back / 0.22));
        const settle = st * st * (3 - 2 * st);
        for (let i = 0; i < NSHARD; i++) {
          const sd = shardSeed[i];
          // Its place in the corridor: its own slot, less how far the field
          // has travelled, wrapped into one lap. A plate that goes past the
          // lens comes back at the far end, and the lap count is what tells it
          // which subject to carry now.
          const raw = FLOW_NEAR + sd.slot * FLOW_LEN + FLOW_DIR * travel;
          const lap = Math.floor((raw - FLOW_NEAR) / FLOW_LEN);
          const dNow = raw - lap * FLOW_LEN;
          const z = zoom - dNow;
          let bx, by, R;
          if (lap === 0) {
            // where the break threw it: its own slot, at its own angle, its own
            // share of what the frame holds at that depth
            R = 0.244 * (FLOW_NEAR + sd.slot * FLOW_LEN) * sd.frac;
            shardS[i] = sd.siz;
          } else {
            // and every pass after it is drawn where it came in — the far end
            // running one way, the near end the other. Fixed in the world from
            // there, so it opens out as it comes on, or closes in as it goes.
            const h = i * 31 + Math.abs(lap) * 977;
            // Coming on at the far end it starts near the axis and opens out
            // as it approaches. Going the other way it has to start OUTSIDE the
            // frame, close to the lens, and slide in as it withdraws — its
            // radius on screen is frac·(spawn distance)/(distance now), so a
            // frac above one is off-frame at first and inside soon after. Spawn
            // it inside instead and the field would only ever drain toward the
            // vanishing point, never fill.
            const dIn = FLOW_DIR > 0 ? FLOW_NEAR : FLOW_FAR;
            R =
              0.244 *
              dIn *
              (FLOW_DIR > 0
                ? 1.05 + 1.55 * hsh(h + 3)
                : 0.14 + 0.8 * hsh(h + 3));
            shardS[i] = P.plateMin + P.plateMax * hsh(h + 7);
          }
          const ang =
            lap === 0
              ? sd.ang
              : (i + Math.abs(lap) * NSHARD) * 2.39996 +
                (hsh(i * 31 + Math.abs(lap) * 977) * 2 - 1) * 0.35;
          bx = Math.cos(ang) * R * aspNow;
          by = Math.sin(ang) * R;
          // what it carries on this lap: its place in the queue, twenty further
          // along for every lap it has run
          subOf[i] = subjectAt(i - lap * CYCLE);
          // Parallax proper: each flake slides by its own depth, on x and y
          // only. A camera rotation moved the whole field as one block, which
          // is what made it read as flat.
          // the near ones slide most, and a lifted plate is very near indeed
          const par = Math.max(
            0.3,
            Math.min(1.35, 0.35 + 0.65 * ((z + 2.2) / 4.4)),
          );
          // frame-rate independent, so the lag is the same at 30 as at 120
          const k = 1 - Math.exp(-sd.ease * ctx.dt);
          followX[i] += (aimYaw / P.aimYaw - followX[i]) * k;
          followY[i] += (aimPitch / P.aimPitch - followY[i]) * k;
          const cs = Math.cos(sd.skew),
            sn = Math.sin(sd.skew);
          const fx = followX[i] * sd.amp,
            fy = followY[i] * sd.amp;
          // At burst 0 every plate sits WHERE THE PAPER IS. The hero used to
          // be one block and the pieces were all born at its centre; it is
          // three webs now, so a plate starts as a piece torn out of one —
          // its column, and its own height down that column. Three columns of
          // seven, which is what twenty plates come to. Without this the
          // paper would simply fade while a separate set of plates flew in
          // from the middle, and the break would read as two things crossing
          // rather than as one thing tearing.
          const anX = ((i % 3) - 1) * webNW * P.webSpread;
          const anY =
            (((Math.floor(i / 3) + 0.5) / WEB_ROWS) * 2 - 1) * webNH * 0.94;
          // out of the paper on the break's own throw, then eased into its
          // place in the corridor as the cards come up
          const tx = sd.dir[0] * sd.dist,
            ty = sd.dir[1] * sd.dist,
            tz = sd.dir[2] * sd.dist;
          const ox = tx + (bx - tx) * settle;
          const oy = ty + (by - ty) * settle;
          const oz = tz + (z - tz) * settle;
          shardP[i * 3] =
            anX + (ox - anX) * burst + (fx * cs - fy * sn) * 0.95 * par * burst;
          shardP[i * 3 + 1] =
            anY + (oy - anY) * burst + (fx * sn + fy * cs) * 0.68 * par * burst;
          shardP[i * 3 + 2] = pageC[2] + (oz - pageC[2]) * burst;
          // and it starts at the width of the column it was torn from, so the
          // piece is the paper's own size at the moment it comes away
          const born = Math.min(1, webHW / Math.max(1e-3, sd.siz * 0.9));
          shardS[i] =
            (sd.siz + (shardS[i] - sd.siz) * settle) *
            (born + (1 - born) * burst);
          shardR[i] = shardS[i] * sd.far;
          fieldR = Math.max(
            fieldR,
            Math.hypot(shardP[i * 3], shardP[i * 3 + 1], shardP[i * 3 + 2]) +
              shardR[i],
          );
        }

        // Past the break the field is quads and the marcher has nothing left to
        // find: skipping both passes outright is worth more than making them
        // cheap. Stage has already cleared the canvas to the ground.
        /* Nothing is marched. The hero is three webs of paper and a field
         * of plates, and both are geometry: the buffer is cleared to the
         * ground and they are drawn straight into it. What used to stand here
         * was the block's own distance field — a rounded box hollowed by
         * travelling lobes, four refraction indices marched twice each and
         * fanned into fourteen spectral samples. It went with the block.
         */
        /* Where the webs are painted.
         *
         * Into the buffer when the arc is here, because the glass pass reads
         * that buffer back and is what puts it on screen. With webs only there
         * is no glass pass — so there is nothing to copy the buffer out, and
         * painting into it would put the webs somewhere no one ever sees. They
         * go straight onto the canvas instead. */
        /* AND WHEN THE GLASS IS IDLE, straight onto the canvas as well.
         * Everything else that wants the buffer — the plates, the sheet, the
         * flood — is inside `burst > 0.001`, and outside the break the glass
         * pass reads the buffer and writes it back unchanged. That was a
         * full screen written and a full screen read, at device pixels,
         * sixty times a second, to arrive at what was already there. */
        const glassIdle = burst <= 0.001 && washG <= 0.001;
        if (WEBS_ONLY || glassIdle) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, cw, ch);
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.viewport(0, 0, fw, fh);
        }
        gl.clearColor(ground[0], ground[1], ground[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        /* ---- the three webs ---------------------------------------------
         * Paper coming off a press. Each web is the subdivided sheet the page
         * was already drawn on — so the travelling waves that lift it off its
         * own plane, and the slope that shades it, are the ones this file
         * already had — reading its own column of the galley through a window
         * that slides down for ever.
         *
         * Sized off what the camera can actually see at the webs' own depth
         * rather than in world units: the three columns then hold their
         * composition on a phone and on a wide desktop, instead of being tuned
         * to whatever window they were written in.
         *
         * They let go as the break takes over — by then their pieces are the
         * plates, and two paper surfaces in the same place would fight.
         */
        /* The paper lets go exactly over the throw that carries its pieces
         * away. Held longer and a web sits behind the plates it has already
         * become; released sooner and there is a gap where the hero is
         * nothing at all. */
        const webFade = (1 - sm(0.0, 0.22, burst)) * presence * ctx.vis;
        // Nothing moves while the paper is not on screen: the cost is real,
        // small, and pointless against a web nobody can see.
        if (webFade > 0.002) liveTick(ctx.t, ctx.dt);
        if (webFade > 0.002 && galleyTex) {
          const nw = webNW,
            hw = webHW,
            hh = webHH;
          gl.useProgram(quad);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform2f(uq.uRes, cw, ch);
          gl.uniform2f(uq.uCentre, centre[0], centre[1]);
          gl.uniform1f(uq.uZoom, zoom);
          gl.uniform3f(uq.uBG, ground[0], ground[1], ground[2]);
          gl.uniform1f(uq.uRoom, P.room);
          gl.uniform1f(uq.uExposure, P.exposure);
          gl.uniform1f(uq.uPresence, presence * ctx.vis);
          gl.uniform1f(uq.uAlpha, webFade);
          gl.uniform1f(uq.uLift, P.paper * P.webLift);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, galleyTex);
          gl.uniform1i(uq.uTex, 0);
          gl.uniform1f(uq.uTiles, 0);
          gl.uniform1f(uq.uTile, 0);
          gl.uniform1f(uq.uSpin, 0);
          gl.uniform1f(uq.uWash, 0);
          gl.uniform3f(uq.uWashC, WASH_C[0], WASH_C[1], WASH_C[2]);
          gl.uniform3f(uq.uAz, 0, 0, 1);
          gl.uniform3f(uq.uAx, hw, 0, 0);
          gl.uniform3f(uq.uAy, 0, hh, 0);
          gl.uniform1f(uq.uBend, P.bend * hh * P.webBend);
          gl.uniform1f(uq.uEdge, P.webEdge);
          gl.uniform1f(uq.uShade, P.webShade);
          /* THE RADIUS, FROM THE ANGLE AND THE FRAME. The control is the wrap
           * at the edge of the frame, so the radius follows the window: the
           * three keep the same curvature to the eye whatever the page is
           * resized to, which a fixed radius would not. */
          const curveR = P.webCurve > 1e-3 ? nw / P.webCurve : 0;
          const curveRy = curveR / Math.max(1e-4, P.webDome);
          gl.uniform3f(uq.uCurve, curveR, P.webCurveSh, P.webDome);
          gl.uniform3f(uq.uInkC, P.inkPivot, P.inkGain, P.inkBias);
          gl.bindVertexArray(pageVao);
          // a column each: web k reads the kth third of the sheet, and no
          // page it shows exists anywhere else on the reel
          const du = 1 / GALLEY_COLS,
            gutter = du;
          /* How much of a lap is in shot is NOT a taste decision — it is
           * whatever keeps a texel square. Choose it by hand and the type is
           * stretched or squeezed by however wrong the guess was, and it goes
           * wrong again the moment the column changes width. */
          const dv = (GALLEY_COL * hh) / (GALLEY_H * hw);
          /* The three do not run at the same rate. Identical speeds read as
           * one image cut into three; a few per cent apart and the gap between
           * two mastheads keeps changing, which is what says three presses. */
          for (let k = 0; k < 3; k++) {
            /* NORMALISED BY THE LENGTH OF THE REEL. A web's speed on screen
             * is its rate over the fraction of the reel in shot, and that
             * fraction is one over the number of pages — so cutting the
             * column from nine pages to six would have slowed the paper by
             * half again, silently, and made every tuned number in the panel
             * mean something else. */
            const rate =
              P["webSpd" + k] * (REEL_REF / Math.max(1, REEL.length));
            /* EACH WEB CLIMBS INTO PLACE, and it does not fade. Paper fed off
             * a press arrives from below at full ink; a sheet that appears
             * by getting less transparent is a layer being switched on. It
             * starts a whole frame below where it belongs, so the boot's
             * mark is covered by newsprint rather than by nothing.
             *
             * SMOOTHER-STEP, not an ease-out. A cubic spends most of its
             * speed in the first third and then crawls, and the eye reads
             * the crawl as the motion stopping before it has stopped — a
             * quintic has zero velocity AND zero acceleration at both ends,
             * so there is no moment where the arrival hands over to the
             * running speed. That handover was the brutal part; it is not
             * an event any more. */
            const inK = clamp01(
              (clock - (bootAt === null ? clock : bootAt) - WEB_IN[k]) / 1.7,
            );
            const inE = inK * inK * inK * (inK * (inK * 6 - 15) + 10);
            const outK = clamp01((outSec - WEB_IN[k]) / OUT_RAMP);
            const outE = outK * outK * outK * (outK * (outK * 6 - 15) + 10);
            // at rest means arrived AND not leaving: a page tells its story
            // on a sheet that is standing still, in either direction
            WEB_INE[k] = inE * (1 - outE);

            /* THE MONTAGE. At cut 0 the paper runs, which is a press. Above it
             * the web stops running and starts EDITING: it holds on a page for
             * a beat and cuts to the next, three pages apart from its
             * neighbours, and the later pages come faster — the compression a
             * title sequence uses to cross an age in thirty seconds. */
            let v;
            if (P.webCut > 0.5 && CUTS.length) {
              const n = CUTS.length;
              const t = clock / Math.max(0.12, P.webBeat);
              const i = Math.floor(t) + k * 3;
              const j = ((i % n) + n) % n;
              v = CUTS[j];
            } else {
              /* A WHOLE PAGE APART IS STILL IN STEP. Offsetting each web by
               * exactly one page put a different page in each column, which
               * was the point — but it also put every page BOUNDARY at the
               * same height, so the three mastheads sat in a row and the
               * webs read as one grid rather than as three sheets coming off
               * a press. Broken by a third of a page and two thirds, which
               * are not multiples of each other or of a page, so no two
               * columns ever line up. */
              /* A THIRD OF THE REEL APART, not a page. A page is what the
               * offset used to be, and a web shows nearly two of them — so
               * the windows overlapped and the column beside you was partly
               * reading the same paper. The lag is a fine adjustment on top
               * of that third, in pages, which is what it is good for. */
              /* AND IT DOES NOT START ON THE SAME PAPER TWICE. The clock
               * begins at zero every load, so the three webs always opened
               * on the same three pages of the reel however different the
               * pages themselves were. One phase, drawn at load, moves the
               * whole set — the spacing between the webs is untouched. */
              /* AND THE PAPER IS RUNNING FASTER AS IT ARRIVES. The sheet
               * used to climb into place while the reel scrolled at its
               * cruising rate the whole time, so the moment the climb
               * finished was the moment all the motion stopped at once.
               * A decaying offset in the scroll gives the press an extra
               * turn of speed that eases into the running one — the
               * arrival is a press winding down to its rate, which is what
               * it looks like on a stone floor. */
              const runIn = (1 - inE) * 0.075;
              v =
                (clock * rate + WEB_PHASE + k / 3 +
                  P["webLag" + k] * PAGE_STEP * 0.5 - runIn + 2) % 1;
            }
            const cxw = (k - 1) * nw * P.webSpread + nw * P.webX,
              cyw = webNH * P.webY;
            /* HOW FAR BELOW IT STARTS: exactly its own half-height plus the
             * frame's, so its top edge begins ON the bottom of the frame and
             * the whole climb is on screen. It used to start twice that far
             * down, which spent the first half of the ramp out of sight —
             * and left the boot's mark standing on nothing while it did. */
            /* ONE OFFSET, TWO ENDS OF THE FRAME. The arrival brings the
             * sheet up from below; the departure CARRIES ON UP and takes it
             * off the top, so the paper never reverses — it comes in from the
             * bottom, runs, and leaves through the top, which is what a web
             * on a press does. The whole move is one signed number, so the
             * exit cannot drift out of step with the entrance. */
            const rise = ((1 - inE) - outE) * (cyw + hh + webNH);
            gl.uniform3f(uq.uC, cxw, cyw, 0);
            /* WHERE THE CURSOR IS ON THIS SHEET. The vertex shader projects
             * P.xy * 2.05/d + uCentre and then stretches x by the aspect, so
             * running that backwards from a clip position gives the point on
             * the sheet's plane — and dividing by the half-axes gives it in
             * the sheet's own -1..1. Done here rather than in the shader
             * because it is three numbers a frame, not one per vertex. */
            /* WHERE THE SHEET ACTUALLY IS, once the set is curved. Its
             * centre has swung back and sideways and its width has
             * foreshortened by the cosine of its own angle — inverting the
             * projection against the flat position it no longer occupies put
             * the bell somewhere the cursor was not, and further out the
             * further the sheet sits from the middle. */
            const a0 = curveR > 0 ? cxw / curveR : 0;
            const b0 = curveR > 0 ? cyw / curveRy : 0;
            const ca0 = Math.cos(a0),
              cb0 = Math.cos(b0);
            const xC = curveR > 0 ? Math.sin(a0) * cb0 * curveR : cxw;
            const yC = curveR > 0 ? Math.sin(b0) * curveRy : cyw;
            const zC = curveR > 0 ? ca0 * cb0 * curveR - curveR : 0;
            const dz = Math.max(0.08, zoom - zC);
            const uvx = (ptr.x * cw) / (2 * ch),
              uvy = ptr.y / 2;
            gl.uniform2f(
              uq.uPtr,
              (((uvx - centre[0]) * dz) / 2.05 - xC) /
                Math.max(1e-4, hw * ca0 * cb0),
              (((uvy - centre[1]) * dz) / 2.05 - yC) /
                Math.max(1e-4, hh * cb0),
            );
            gl.uniform3f(
              uq.uPtrK,
              P.ptrLift * ptr.k * hh,
              P.ptrSize,
              hh / Math.max(1e-4, hw),
            );
            gl.uniform4f(
              uq.uWin,
              k * gutter,
              v,
              du,
              dv,
            );
            gl.uniform1f(uq.uAlpha, webFade);
            gl.uniform3f(uq.uC, cxw, cyw - rise, 0);
            /* WHERE THE LEADING EDGE IS, IN THE PAGE'S UNITS. The vertex
             * shader puts a point at clip.y = (P.y*2.05/d + uCentre.y)*2, so
             * the sheet's top edge runs back through that to a viewport
             * pixel — and the boot screen clips itself to it. The mark is
             * not taken off by a timer that happens to run near the paper;
             * it is taken off by the paper. */
            if (k === 1 && bootMark) {
              if (!document.getElementById("boot")) bootMark = false;
              else {
                const r = canvas.getBoundingClientRect();
                const cy = ((cyw + hh - rise) * 2.05) / dz + centre[1];
                window.__webTop = r.top + ((1 - cy * 2) / 2) * r.height;
              }
            }
            // ONE CLOCK FOR THE THREE. The field they read is shared and
            // world-anchored, so a phase per web would make each column
            // sample the same water at a different moment — which is the
            // seam the shared field exists to remove.
            gl.uniform1f(uq.uT, clock * 0.55);
            // what this web is showing, kept for the frame loop: repainting a
            // page no web has in shot is work nobody can see
            WEB_WIN[k] = v;
            WEB_WIN[3] = dv;
            gl.drawElements(gl.TRIANGLES, pageCount, gl.UNSIGNED_SHORT, 0);
          }
          gl.uniform4f(uq.uWin, 0, 0, 0, 0);
          // the plates are flat, and they are drawn with the same program
          gl.uniform3f(uq.uCurve, 0, 0, 0);
          gl.bindVertexArray(null);
        }

        // ---- the plates, straight onto the canvas at full resolution ------
        if (burst > 0.001) {
          const fade = Math.min(1, burst / 0.12);
          gl.useProgram(quad);
          gl.bindVertexArray(quadVao);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform2f(uq.uRes, cw, ch);
          gl.uniform2f(uq.uCentre, centre[0], centre[1]);
          gl.uniform1f(uq.uZoom, zoom);
          gl.uniform3f(uq.uBG, ground[0], ground[1], ground[2]);
          gl.uniform1f(uq.uRoom, P.room);
          gl.uniform1f(uq.uExposure, P.exposure);
          gl.uniform1f(uq.uPresence, presence * ctx.vis);

          // Painter's order: this target carries no depth buffer, and twenty
          // opaque rectangles sort perfectly well on the CPU.
          order.sort((a, b) => shardP[a * 3 + 2] - shardP[b * 3 + 2]);

          // the loops step at eight frames a second, offset per plate so two
          // running the same sequence are never on the same image
          const step = Math.floor(clock * 12);
          for (let i = 0; i < NSHARD; i++)
            tileNow[i] =
              subOf[i] < 0
                ? -1 - subOf[i] // a still, encoded negative
                : STILLS + subOf[i] * FRAMES + ((step + i * 2) % FRAMES);

          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, panelTex || pageTex);
          gl.uniform1i(uq.uTex, 1);
          gl.uniform1f(uq.uTiles, PANEL_N);
          gl.uniform1f(uq.uLift, P.paper * 2.4);
          gl.uniform1f(uq.uBend, 0);
          gl.uniform3f(uq.uPtrK, 0, 1, 1);
          gl.uniform1f(uq.uEdge, 0);
          gl.uniform3f(uq.uInkC, 0.5, 0.0, 0.0);
          gl.uniform3f(uq.uAz, 0, 0, 0);
          gl.uniform1f(uq.uAlpha, fade);
          gl.uniform1f(uq.uWash, 0);
          gl.uniform3f(uq.uWashC, WASH_C[0], WASH_C[1], WASH_C[2]);
          const nk = (2.0 * ch) / cw; // the clip-space stretch on x
          for (const i of OFF.plates ? [] : order) {
            const sc = shardS[i];
            const ou = planes[(i * NFACE + 0) * 4 + 3],
              ol = planes[(i * NFACE + 1) * 4 + 3];
            const ov = planes[(i * NFACE + 2) * 4 + 3],
              od = planes[(i * NFACE + 3) * 4 + 3];
            const hu = ((ou + ol) / 2) * sc,
              hv = ((ov + od) / 2) * sc;
            const cu = ((ou - ol) / 2) * sc,
              cv = ((ov - od) / 2) * sc;
            const px = shardP[i * 3] + shardU[i * 3] * cu + shardV[i * 3] * cv;
            const py =
              shardP[i * 3 + 1] +
              shardU[i * 3 + 1] * cu +
              shardV[i * 3 + 1] * cv;
            const pz =
              shardP[i * 3 + 2] +
              shardU[i * 3 + 2] * cu +
              shardV[i * 3 + 2] * cv;
            /* A plate is dropped only once it is wholly out of shot. The plates
             * are opaque, so anything cruder shows: cut on distance and a piece
             * still covering half the frame vanishes on the spot.
             *
             * Same projection as the vertex shader — 2.05 over the distance,
             * doubled into clip space, and x stretched by the aspect. The
             * plate's own reach is bounded by hu + hv, which covers it whatever
             * way it lies. Off screen when the near edge is past the border.
             */
            const dz = zoom - pz;
            if (dz < 0.25) continue; // behind the lens
            const k = 2.05 / dz;
            const rr = (hu + hv) * k;
            if (Math.abs((px * k + centre[0]) * nk) - rr * nk > 1) continue;
            if (Math.abs((py * k + centre[1]) * 2.0) - rr * 2.0 > 1) continue;
            gl.uniform3f(uq.uC, px, py, pz);
            gl.uniform3f(
              uq.uAx,
              shardU[i * 3] * hu,
              shardU[i * 3 + 1] * hu,
              shardU[i * 3 + 2] * hu,
            );
            gl.uniform3f(
              uq.uAy,
              shardV[i * 3] * hv,
              shardV[i * 3 + 1] * hv,
              shardV[i * 3 + 2] * hv,
            );
            gl.uniform1f(uq.uTile, tileNow[i]);
            gl.uniform1f(uq.uSpin, spinOf[i]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          }

          // and the page, same pass, its own texture
          if (!OFF.page) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pageTex);
            gl.uniform1i(uq.uTex, 0);
            gl.uniform1f(uq.uTiles, 0);
            gl.uniform1f(uq.uSpin, 0);
            gl.uniform1f(uq.uAlpha, fade);
            // it lights before it flattens, so the page reads as lit rather than
            // as painted over
            gl.uniform1f(
              uq.uLift,
              P.paper * 1.35 * (1 + 0.55 * cond + 6.0 * washC),
            );
            gl.uniform1f(uq.uWash, washC);
            // It burns to white first, and only settles onto the next section's
            // paper as it fills the frame. Washing straight to the paper is a
            // page turning into a colour it already nearly is — nothing to see.
            gl.uniform3f(
              uq.uWashC,
              1 - (1 - WASH_C[0]) * washG,
              1 - (1 - WASH_C[1]) * washG,
              1 - (1 - WASH_C[2]) * washG,
            );
            // The sheet is packed with the block for as long as it is inside it —
            // newsprint that kept its size would stand out through the glass —
            // and comes back to its own size as it leaves. It is the glass that
            // compresses, not the page. At burst 0 this is exactly pack, which is
            // what the marched sheet was drawn at on the frame before, so the
            // handoff between the two passes shows nothing.
            const sheetP = pack + (1 - pack) * sm(0, 0.35, burst);
            // and then it takes the frame. What it has to reach is measured, not
            // guessed: a ray at the sheet's own depth spans dz/2.05 world units
            // half-height, so this is exactly the cover, plus a margin for the
            // corners. It follows the camera, so it holds through the widening
            // the break gives the zoom.
            const gathered = sheetP;
            let sheetG = gathered;
            if (washG > 0) {
              const dz = Math.max(0.25, zoom - pageC[2]);
              const nh = dz / 2.05,
                nw = nh * (cw / Math.max(1, ch));
              const full =
                Math.max(
                  nw / (P.box * 1.05 * P.sheetS),
                  nh / (P.box * 1.45 * P.sheetS),
                ) * 1.2;
              sheetG = gathered + (full - gathered) * washG;
            }
            const hx = P.box * 1.05 * P.sheetS * sheetG,
              hy = P.box * 1.45 * P.sheetS * sheetG;
            // and it drifts, a little, on a longer period than it turns
            gl.uniform3f(uq.uC, pageC[0], pageC[1], pageC[2]);
            gl.uniform3f(
              uq.uAx,
              plateM[0] * hx,
              plateM[3] * hx,
              plateM[6] * hx,
            );
            gl.uniform3f(
              uq.uAy,
              plateM[1] * hy,
              plateM[4] * hy,
              plateM[7] * hy,
            );
            gl.uniform3f(uq.uAz, plateM[2], plateM[5], plateM[8]);
            gl.uniform1f(uq.uBend, P.bend * hy * (1 - washG));
            gl.uniform1f(uq.uT, clock * 0.55);
            gl.bindVertexArray(pageVao);
            gl.drawElements(gl.TRIANGLES, pageCount, gl.UNSIGNED_SHORT, 0);
          }
        }

        gl.bindVertexArray(null);

        if (!OFF.inside && !WEBS_ONLY && !glassIdle) {
          // out of the buffer and through the glass we are now standing in
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, cw, ch);
          gl.disable(gl.BLEND);
          gl.useProgram(inside);
          gl.bindVertexArray(vao);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, fbTex);
          gl.uniform1i(ui.uTex, 0);
          gl.uniform3f(ui.uBG, ground[0], ground[1], ground[2]);
          // Full almost at once. It is the moment of going inside that the
          // effect is for, so it belongs at the start of the break, not a
          // third of the way through it — and it stays, because the camera
          // does not come back out of the block.
          // and it lets go as the page floods: the effect mirrors the frame
          // into itself, which on a sheet the size of the frame is the page
          // printed twice, once upside down
          gl.uniform1f(ui.uAmt, P.inside * sm(0.02, 0.16, burst) * (1 - washG));
          gl.uniform1f(ui.uAspect, cw / Math.max(1, ch));
          gl.uniform1f(ui.uBend, P.insideBend);
          gl.uniform1f(ui.uDisp, P.insideDisp);
          gl.uniform1f(ui.uRim, P.insideRim);
          gl.uniform1f(ui.uT, clock);
          gl.uniform1f(ui.uAmp, P.insideAmp);
          gl.uniform1f(ui.uFreq, P.insideFreq);
          gl.uniform1f(ui.uSpeed, P.insideSpeed);
          gl.uniform1f(ui.uBand, P.insideBand);
          gl.uniform1f(ui.uSheen, P.insideSheen);
          gl.uniform2f(ui.uCentre, centre[0], centre[1]);
          // the same rotation the body had, so the room turns with it
          gl.uniformMatrix3fv(ui.uSpin, false, orient);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.bindVertexArray(null);
        }
        gl.enable(gl.BLEND);
      },
    };
  })(),
);
