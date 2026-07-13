const SiteSettings = require("../models/siteSettings.model");

exports.getPublicSettings = async (req, res, next) => {
  try {
    const data = await SiteSettings.getAllSettings();
    if (data.preferences?.language === "BANGLA") {
      data.home = { ...data.home, heroKicker:"ন্যায্য মূল্যে মানসম্মত সেবা", heroTitle:"দক্ষ, দ্রুত ও বিশ্বস্ত ঘরোয়া সেবা", heroSubtitle:"যাচাইকৃত সেবাদাতার মাধ্যমে এসি মেরামত, পানির লাইন, গ্যাসের চুলা, ঘর পরিষ্কার ও বৈদ্যুতিক সেবা সহজে বুক করুন।", primaryButtonText:"এখনই শুরু করুন", secondaryButtonText:"সব সেবা দেখুন", heroImageAlt:"দক্ষ সেবাদাতা", badgeOne:"যাচাইকৃত সেবাদাতা", badgeTwo:"দ্রুত বুকিং", badgeThree:"সরাসরি কথোপকথন", stripOneTitle:"নিরাপদ প্রবেশ", stripOneText:"গ্রাহক ও সেবাদাতার আলাদা ব্যবস্থা", stripTwoTitle:"সেবার এলাকা", stripTwoText:"জেলা, থানা ও ওয়ার্ড অনুযায়ী খোঁজ", stripThreeTitle:"সহজ কার্যপ্রবাহ", stripThreeText:"বুকিং থেকে কাজ সম্পন্ন পর্যন্ত পূর্ণ নিয়ন্ত্রণ" };
      data.whyChoose = { ...data.whyChoose, kicker:"আমাদের কেন বেছে নেবেন", title:"বুকিং থেকে কাজ শেষ—বিশ্বাসযোগ্য সেবা", description:"ঘরের কাজে দক্ষ সহায়তা পাওয়ার নিরাপদ ও সহজ উপায়।", itemOneTitle:"যাচাইকৃত পেশাজীবী", itemOneText:"অনুমোদনের আগে পরিচয় ও সেবার তথ্য যাচাই করা হয়।", itemTwoTitle:"স্বচ্ছ কার্যপ্রবাহ", itemTwoText:"বুকিং, নিয়োগ, কথোপকথন, পরিশোধ ও কাজ সম্পন্ন হওয়া অনুসরণ করুন।", itemThreeTitle:"স্থানীয় ও দ্রুত", itemThreeText:"জেলা, থানা ও ওয়ার্ড অনুযায়ী সেবাদাতা খুঁজুন।" };
      data.promo = { ...data.promo, kicker:"সাশ্রয়ী সেবার সমাধান", title:"ন্যায্য মূল্যে উন্নত ও আন্তরিক সেবা", description:"আপনার প্রয়োজন অনুযায়ী নির্ভরযোগ্য ঘরোয়া সেবা প্রদান করা হয়।", buttonText:"যোগাযোগ করুন" };
      data.about = { ...data.about, title:"অনডিমান্ড সম্পর্কে", description:"অনডিমান্ড গ্রাহকদের যাচাইকৃত সেবাদাতার সঙ্গে যুক্ত করে। আমাদের লক্ষ্য সেবা বুকিংকে সহজ, নিরাপদ ও বিশ্বস্ত করা।", missionTitle:"লক্ষ্য", missionText:"সবার জন্য স্থানীয় কারিগরি সেবা নিরাপদ, দ্রুত ও সহজলভ্য করা।", visionTitle:"দূরদর্শিতা", visionText:"যাচাইকৃত সেবাদাতা ও শক্তিশালী গ্রাহক সহায়তার মাধ্যমে বিশ্বস্ত সেবা ব্যবস্থা গড়ে তোলা।" };
      data.contact = { ...data.contact, pageTitle:"যোগাযোগ", pageSubtitle:"বার্তা পাঠান, আমাদের দল দ্রুত উত্তর দেবে।", supportTitle:"সহায়তার তথ্য", supportHours:"সকাল ৯টা থেকে রাত ১০টা", supportNote:"বুকিং সংক্রান্ত বিষয়ে গ্রাহক ও সেবাদাতা ড্যাশবোর্ডের কথোপকথন ব্যবহার করতে পারবেন।", homeKicker:"যোগাযোগের তথ্য", homeTitle:"যোগাযোগ রাখুন", homeDescription:"আপনার প্রয়োজনীয় সহায়তা দ্রুত দেওয়াই আমাদের অগ্রাধিকার।" };
      const serviceBn={AC_REPAIR:["এসি মেরামত","এসি মেরামত, পরিষ্কার, গ্যাস ভরা ও ঠান্ডা না হওয়ার সমাধান।"],PLUMBING:["পানির লাইন","পানির লাইন, ফুটো ও বাথরুমের কাজ।"],GAS_STOVE_REPAIR:["গ্যাসের চুলা","চুলা, বার্নার ও রান্নাঘরের গ্যাস লাইনের সেবা।"],HOME_CLEANING:["ঘর পরিষ্কার","নিয়মিত ও গভীরভাবে ঘর পরিষ্কারের সেবা।"],HOME_ELECTRONICS:["ঘরের বৈদ্যুতিক কাজ","টিভি, পাখা, বাতি, সুইচ ও বৈদ্যুতিক লাইনের সেবা।"]};
      data.services=(data.services||[]).map((item)=>serviceBn[item.key] ? {...item,title:serviceBn[item.key][0],desc:serviceBn[item.key][1]} : item);
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
