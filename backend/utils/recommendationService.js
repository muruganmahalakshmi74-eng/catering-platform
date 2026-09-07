const toAmount = (raw, suffix = '') => {
  const value = parseFloat(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;

  const unit = suffix.toLowerCase().trim();
  if (unit === 'k') return Math.round(value * 1000);
  if (['l', 'lakh', 'lakhs', 'lac', 'lacs'].includes(unit)) return Math.round(value * 100000);
  if (['cr', 'crore', 'crores'].includes(unit)) return Math.round(value * 10000000);
  return Math.round(value);
};

const NON_VEG_WORDS =
  /\b(non[-\s]?veg(etarian)?|nonveg|chicken|mutton|lamb|beef|pork|fish|seafood|prawn|shrimp|crab|egg|eggs|meat|kebab|tandoori chicken)\b/i;
const VEG_WORDS = /\b(veg|vegetarian|pure[-\s]?veg|shakahari|jain|sattvic|vegan|plant[-\s]?based)\b/i;

const NEGATED_NON_VEG =
  /\b(no|without|avoid|exclude|not?)\s+(any\s+)?(non[-\s]?veg(etarian)?|nonveg|chicken|mutton|meat|fish|egg|eggs|seafood)\b/i;

const MIN_BARE_BUDGET = 500;

const OCCASIONS = [
  'wedding', 'reception', 'sangeet', 'mehendi', 'engagement',
  'birthday', 'anniversary', 'corporate', 'office', 'conference',
  'housewarming', 'griha pravesh', 'baby shower', 'festival', 'party',
];

function parseQuery(query) {
  const text = String(query || '');
  const lower = text.toLowerCase();

  let isVeg = null;
  if (NEGATED_NON_VEG.test(lower)) {
    isVeg = true;
  } else if (NON_VEG_WORDS.test(lower)) {
    isVeg = false;
  } else if (VEG_WORDS.test(lower)) {
    isVeg = true;
  }

  let guestCount = null;
  let guestSpan = null;
  const guestPatterns = [
    /(\d[\d,]*)\s*(?:\+)?\s*(?:people|persons?|person|guests?|pax|heads?|members?|attendees|plates?|adults)\b/i,
    /\b(?:party|group|gathering|event)\s+of\s+(\d[\d,]*)/i,
    /\bfor\s+(\d[\d,]*)\s*(?:people|persons?|guests?|pax)?\b/i,
  ];
  for (const pattern of guestPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const parsed = parseInt(match[1].replace(/,/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        guestCount = parsed;
        guestSpan = [match.index, match.index + match[0].length];
        break;
      }
    }
  }

  const withoutGuests = guestSpan
    ? lower.slice(0, guestSpan[0]) + ' '.repeat(guestSpan[1] - guestSpan[0]) + lower.slice(guestSpan[1])
    : lower;

  let budgetPerPerson = null;
  const perPersonMatch = withoutGuests.match(
    /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|cr|crores?)?\s*(?:\/|per\s*)(?:person|head|plate|pax|guest)\b/i
  );
  if (perPersonMatch) {
    budgetPerPerson = toAmount(perPersonMatch[1], perPersonMatch[2] || '');
  }

  let budget = null;
  const budgetPatterns = [

    /\b(?:budget(?:\s*(?:of|is|:))?|under|within|below|upto|up\s*to|max(?:imum)?|around|about|approx(?:imately)?|not\s+more\s+than)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|cr|crores?)?\b/i,

    /(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|cr|crores?)?/i,

    /\b(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|cr|crores?)\b/i,

    /\b(\d{3,}(?:,\d{2,3})*)\b/,
  ];
  for (const pattern of budgetPatterns) {
    const match = withoutGuests.match(pattern);
    if (match) {
      const amount = toAmount(match[1], match[2] || '');

      if (amount && amount !== budgetPerPerson && amount >= MIN_BARE_BUDGET) {
        budget = amount;
        break;
      }
    }
  }

  if (budget && guestCount && !budgetPerPerson) {
    budgetPerPerson = Math.floor(budget / guestCount);
  } else if (budgetPerPerson && guestCount && !budget) {
    budget = budgetPerPerson * guestCount;
  }

  const occasion = OCCASIONS.find((word) => lower.includes(word)) || null;

  return { isVeg, guestCount, budget, budgetPerPerson, occasion, raw: text };
}

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

function scorePackage(pkg, parsed) {
  const { guestCount, budget, budgetPerPerson, isVeg, occasion } = parsed;
  const reasons = [];
  const warnings = [];
  let score = 50;

  const totalPrice = guestCount ? pkg.pricePerPerson * guestCount : null;

  if (isVeg === true) {
    if (pkg.isVeg) {
      score += 20;
      reasons.push('Fully vegetarian, as requested');
    } else {

      score -= 40;
      warnings.push('Contains non-vegetarian items');
    }
  } else if (isVeg === false) {
    if (!pkg.isVeg) {
      score += 20;
      reasons.push('Includes non-vegetarian dishes, as requested');
    } else {
      score -= 15;
      warnings.push('Vegetarian only - no non-vegetarian dishes');
    }
  }

  if (guestCount != null) {
    if (guestCount < pkg.minGuests) {
      score -= 25;
      warnings.push(`Needs at least ${pkg.minGuests} guests (you have ${guestCount})`);
    } else if (guestCount > pkg.maxGuests) {
      score -= 25;
      warnings.push(`Serves at most ${pkg.maxGuests} guests (you need ${guestCount})`);
    } else {
      score += 15;
      reasons.push(`Serves ${guestCount} guests (range ${pkg.minGuests}-${pkg.maxGuests})`);
    }
  }

  if (budget != null && totalPrice != null) {
    if (totalPrice > budget) {
      score -= 30;
      warnings.push(`₹${totalPrice.toLocaleString('en-IN')} exceeds your ₹${budget.toLocaleString('en-IN')} budget`);
    } else {
      const remaining = budget - totalPrice;
      const usage = totalPrice / budget;
      score += 15 * usage;
      reasons.push(
        `₹${totalPrice.toLocaleString('en-IN')} total - ₹${remaining.toLocaleString('en-IN')} under budget`
      );
    }
  } else if (budgetPerPerson != null) {
    if (pkg.pricePerPerson > budgetPerPerson) {
      score -= 30;
      warnings.push(`₹${pkg.pricePerPerson}/person exceeds your ₹${budgetPerPerson}/person budget`);
    } else {
      score += 15 * (pkg.pricePerPerson / budgetPerPerson);
      reasons.push(`₹${pkg.pricePerPerson}/person fits your ₹${budgetPerPerson}/person budget`);
    }
  }

  const tags = (pkg.tags || []).map((t) => String(t).toLowerCase());
  if (occasion && tags.some((t) => t.includes(occasion))) {
    score += 5;
    reasons.push(`Suited to ${occasion} events`);
  }
  if (Array.isArray(pkg.items) && pkg.items.length >= 4) {
    score += 3;
    reasons.push(`${pkg.items.length} dishes included`);
  }

  return {
    type: 'package',
    package: pkg,
    pricePerPerson: pkg.pricePerPerson,
    totalPrice,
    matchScore: clampScore(score),
    reasons,
    warnings,
    fits: warnings.length === 0,
  };
}

function scoreAndRank(packages, menuItems, parsed) {
  const { guestCount, budget, budgetPerPerson, isVeg } = parsed;

  const scored = packages.map((pkg) => scorePackage(pkg, parsed));
  const byScore = (a, b) => b.matchScore - a.matchScore;

  const recommendations = scored.filter((entry) => entry.fits).sort(byScore).slice(0, 3);
  const alternatives = scored.filter((entry) => !entry.fits).sort(byScore).slice(0, 3);

  let menuItemSuggestions = [];
  if (recommendations.length === 0) {
    const perPlateCap = budgetPerPerson ?? (budget && guestCount ? budget / guestCount : null);

    menuItemSuggestions = menuItems
      .filter((item) => (isVeg === true ? item.isVeg : true))
      .filter((item) => (perPlateCap == null ? true : item.price <= perPlateCap))
      .sort((a, b) => b.price - a.price)
      .slice(0, 3)
      .map((item) => ({
        type: 'menuItem',
        item,
        pricePerPlate: item.price,
        totalPrice: guestCount ? item.price * guestCount : null,
        reasons: [
          perPlateCap
            ? `₹${item.price}/plate fits a ₹${Math.floor(perPlateCap)}/person budget`
            : `₹${item.price}/plate`,
        ],
      }));
  }

  return {
    recommendations,
    alternatives,
    menuItemSuggestions,
    explanation: buildExplanation(parsed, recommendations, alternatives, menuItemSuggestions),
  };
}

function buildExplanation(parsed, recommendations, alternatives, menuItemSuggestions) {
  const { isVeg, guestCount, budget, budgetPerPerson } = parsed;

  const constraints = [];
  if (isVeg === true) constraints.push('vegetarian');
  if (isVeg === false) constraints.push('non-vegetarian');
  if (guestCount) constraints.push(`${guestCount} guests`);
  if (budget) {
    constraints.push(
      `a ₹${budget.toLocaleString('en-IN')} budget` +
        (budgetPerPerson ? ` (₹${budgetPerPerson}/person)` : '')
    );
  } else if (budgetPerPerson) {
    constraints.push(`₹${budgetPerPerson} per person`);
  }

  const understood = constraints.length
    ? `Looking for ${constraints.join(', ')}.`
    : 'No specific diet, guest count or budget detected, so all available packages are ranked.';

  if (recommendations.length > 0) {
    return `${understood} Found ${recommendations.length} matching package${
      recommendations.length > 1 ? 's' : ''
    } at this restaurant.`;
  }
  if (menuItemSuggestions.length > 0) {
    return `${understood} No package matches every constraint, so individual dishes within budget are suggested${
      alternatives.length ? ', along with the closest packages' : ''
    }.`;
  }
  if (alternatives.length > 0) {
    return `${understood} No package matches every constraint - the closest options are shown with the trade-offs listed.`;
  }
  return `${understood} This restaurant has no available packages matching the request.`;
}

module.exports = { parseQuery, scoreAndRank, scorePackage };
