// ============================================================
// Meta (Facebook) Pixel — base code, শেয়ার্ড। সব কাস্টমার-facing পেজের <head>-এ
// <script src="pixel.js"> (সাব-ফোল্ডারে "../pixel.js") দিয়ে include হয়:
//   index.html, about-us.html, search.html, track.html, complain.html,
//   furniture/index.html, fashion/index.html, products/index.html আর products/-এর সব ডিটেইল পেজ।
// admin.html-এ এটা বসানো হয়নি ইচ্ছাকৃতভাবে — ওটা কাস্টমার-facing পেজ না।
// Purchase ইভেন্ট আর advanced matching (ফোন/নাম) script.js-এ অর্ডার কনফার্মের সময় পাঠানো হয়।
// ============================================================
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1953763731979924');
fbq('track', 'PageView');
