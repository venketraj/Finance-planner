"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface QuoteItem {
  text: string;
  author: string;
  category: "quote" | "tip" | "fact";
}

const FINANCE_CONTENT: QuoteItem[] = [
  // Quotes
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett", category: "quote" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "quote" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett", category: "quote" },
  { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham", category: "quote" },
  { text: "Wide diversification is only required when investors do not understand what they are doing.", author: "Warren Buffett", category: "quote" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett", category: "quote" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton", category: "quote" },
  { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott", category: "quote" },
  { text: "It's not how much money you make, but how much money you keep, how hard it works for you.", author: "Robert Kiyosaki", category: "quote" },
  { text: "Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it.", author: "Albert Einstein", category: "quote" },
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder", category: "quote" },
  { text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.", author: "Dave Ramsey", category: "quote" },
  { text: "Never depend on a single income. Make investment to create a second source.", author: "Warren Buffett", category: "quote" },
  { text: "The biggest risk of all is not taking one.", author: "Mellody Hobson", category: "quote" },
  { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock", category: "quote" },
  { text: "The secret to wealth is simple: find a way to do more for others than anyone else does.", author: "Tony Robbins", category: "quote" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", category: "quote" },
  { text: "Time in the market beats timing the market.", author: "Ken Fisher", category: "quote" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", category: "quote" },
  { text: "Invest in yourself. Your career is the engine of your wealth.", author: "Paul Clitheroe", category: "quote" },

  // Investment Tips
  { text: "Start your SIP early — even ₹500/month invested for 30 years at 12% p.a. grows to over ₹17 lakhs.", author: "Investment Tip", category: "tip" },
  { text: "The 50-30-20 rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and investments.", author: "Investment Tip", category: "tip" },
  { text: "Rebalance your portfolio at least once a year to maintain your target asset allocation.", author: "Investment Tip", category: "tip" },
  { text: "Keep 3–6 months of expenses as an emergency fund in a liquid account before investing.", author: "Investment Tip", category: "tip" },
  { text: "Index funds consistently outperform 80–90% of actively managed funds over a 10-year period.", author: "Investment Tip", category: "tip" },
  { text: "ELSS mutual funds offer the best returns among Section 80C tax-saving instruments with only a 3-year lock-in.", author: "Investment Tip", category: "tip" },
  { text: "Don't try to time the market. Stay invested through market cycles to benefit from long-term growth.", author: "Investment Tip", category: "tip" },
  { text: "Increase your SIP amount by 10% every year to combat inflation and boost your FIRE corpus.", author: "Investment Tip", category: "tip" },
  { text: "Avoid emotional decisions during market downturns — historically, Indian markets have always recovered and hit new highs.", author: "Investment Tip", category: "tip" },
  { text: "A direct plan mutual fund has no distributor commission — over 20 years, the difference in returns can be 1–1.5% p.a.", author: "Investment Tip", category: "tip" },
  { text: "Review your insurance coverage annually. Term insurance should be 10–15x your annual income.", author: "Investment Tip", category: "tip" },
  { text: "PPF offers sovereign guarantee + EEE tax benefit (Exempt-Exempt-Exempt) — ideal for low-risk long-term savings.", author: "Investment Tip", category: "tip" },
  { text: "Before redeeming equity investments, check if you've held them for more than 1 year to benefit from LTCG tax rates.", author: "Investment Tip", category: "tip" },

  // Market Facts
  { text: "The Sensex has delivered approximately 15% CAGR over the last 30 years, turning ₹1 lakh into over ₹66 lakhs.", author: "Market Fact", category: "fact" },
  { text: "India's mutual fund industry AUM crossed ₹50 lakh crore in 2024, reflecting growing investor confidence.", author: "Market Fact", category: "fact" },
  { text: "The Rule of 72: divide 72 by your annual return rate to find how many years it takes to double your money.", author: "Market Fact", category: "fact" },
  { text: "Small-cap stocks in India have delivered ~20% CAGR over 20 years, but with significantly higher volatility.", author: "Market Fact", category: "fact" },
  { text: "NPS (National Pension System) Tier-I offers additional tax deduction of ₹50,000 under Section 80CCD(1B).", author: "Market Fact", category: "fact" },
  { text: "LTCG on equity above ₹1 lakh per year is taxed at 10%, while STCG on equity is taxed at 15%.", author: "Market Fact", category: "fact" },
  { text: "India's household savings rate is around 20% of GDP — one of the highest among emerging economies.", author: "Market Fact", category: "fact" },
  { text: "Systematic Transfer Plans (STPs) reduce risk when moving a lump sum from debt to equity funds gradually.", author: "Market Fact", category: "fact" },
  { text: "The Nifty 50 has never given negative returns over any 7-year rolling period in the last 25 years.", author: "Market Fact", category: "fact" },
  { text: "Gold has historically returned around 9–10% CAGR in INR terms over 20 years, acting as a hedge against inflation.", author: "Market Fact", category: "fact" },
];

const CATEGORY_STYLES: Record<QuoteItem["category"], { bg: string; label: string }> = {
  quote: { bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900", label: "Quote" },
  tip:   { bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900", label: "Tip" },
  fact:  { bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900", label: "Did You Know" },
};

export function FinanceQuotes() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * FINANCE_CONTENT.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % FINANCE_CONTENT.length);
        setFade(true);
      }, 400);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const item = FINANCE_CONTENT[index];
  const style = CATEGORY_STYLES[item.category];

  return (
    <Card className={`border ${style.bg} transition-all duration-300`}>
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          {style.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p
          className="text-sm leading-relaxed text-foreground/90 transition-opacity duration-300"
          style={{ opacity: fade ? 1 : 0 }}
        >
          &ldquo;{item.text}&rdquo;
        </p>
        <p
          className="mt-2 text-right text-xs font-medium text-muted-foreground transition-opacity duration-300"
          style={{ opacity: fade ? 1 : 0 }}
        >
          — {item.author}
        </p>
      </CardContent>
    </Card>
  );
}
