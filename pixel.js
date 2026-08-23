// ============================================================
// Meta (Facebook) Pixel — base code, শেয়ার্ড। index.html, track.html,
// complain.html তিনটাতেই <head>-এ <script src="pixel.js"> দিয়ে include হয়।
// admin.html-এ এটা বসানো হয়নি ইচ্ছাকৃতভাবে — ওটা কাস্টমার-facing পেজ না।
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
