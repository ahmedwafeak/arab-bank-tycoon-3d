/**
 * LoansManager - Credit underwriting, micro-finance to corporate loans, scaled to bank tier
 */
export class LoansManager {
  constructor(gameState) {
    this.state = gameState;
    this.activeLoans = []; // Starts with 0 active loans!
    this.pendingApplications = [];
    this.defaultedHistory = [];
    this.totalLoansDisbursedCount = 0;

    this.generateMonthlyApplications();
  }

  generateMonthlyApplications() {
    this.pendingApplications = [];
    const tier = this.state.getCurrentTier();

    let pool = [];

    if (tier.id === 1) {
      // Tier 1: Micro-finance & Small Traders (5,000 to 25,000 EGP)
      pool = [
        {
          title: 'تمويل ورشة نجارة وموبيليا (شبرا الخيمة)',
          category: 'تمويل حِرفي ومؤسسي متناهي الصغر',
          isCorporate: true,
          entityType: 'شركة تضامن تجارية مسجلة',
          city: 'شبرا الخيمة - القليوبية',
          amount: 18000,
          tenure: 12,
          rate: 26.0,
          rating: 'A',
          collateral: 'شيكات الشركة + رهن معدات الورشة',
          baseRisk: 0.02,
          note: 'طلب سليم، الورشة تعمل منذ 5 سنوات والطلب المحلي مستمر.'
        },
        {
          title: 'تمويل كشك بقالة وتوريد مواد غذائية (السيدة زينب)',
          category: 'تمويل تجارة تجزئة',
          isCorporate: false,
          amount: 10000,
          tenure: 6,
          rate: 28.0,
          rating: 'AA',
          collateral: 'ضمان تاجر جملة معروف في المنطقة',
          baseRisk: 0.015,
          note: 'سداد سريع وتدفق يومي مضمون، فرصة ربح ممتازة للبنك.'
        },
        {
          title: 'تجهيز عيادة أسنان ومعدات تعقيم حديثة (عين شمس)',
          category: 'تمويل مهن حرة وعيادات',
          isCorporate: false,
          amount: 25000,
          tenure: 18,
          rate: 24.0,
          rating: 'A-',
          collateral: 'كارنيه نقابة الأطباء + وصل أمانة وضامن موظف حكومي',
          baseRisk: 0.025,
          note: 'طبيب متميز وسمعة طيبة، مخاطرة منخفضة.'
        },
        {
          title: 'تمويل بضاعة موسمية لمعرض ملابس وأحذية (العتبة)',
          category: 'تمويل تجاري مؤسسي',
          isCorporate: true,
          entityType: 'شركة ذات مسؤولية محدودة (ش.ذ.م.م)',
          city: 'وسط البلد - القاهرة',
          amount: 15000,
          tenure: 8,
          rate: 27.0,
          rating: 'BBB',
          collateral: 'بضائع مخزنة بمستودع التاجر + سجل تجاري وبطاقة ضريبية',
          baseRisk: 0.035,
          note: 'عائد مرتفع وسريع، يتطلب مراجعة السجل والميزانية لضمان السيولة.'
        },
        {
          title: 'شراء تروسيكل نقل بضائع لخدمة محال الخضار (المرج)',
          category: 'تمويل معدات نقل خفيف',
          isCorporate: false,
          amount: 8000,
          tenure: 6,
          rate: 28.0,
          rating: 'A',
          collateral: 'حظر بيع على المركبة لصالح البنك',
          baseRisk: 0.02,
          note: 'مشروع يعيل أسرة وسداد مضمون بالأقساط الأسبوعية.'
        }
      ];
    } else if (tier.id === 2) {
      // Tier 2: SME Loans (40,000 to 250,000 EGP)
      pool = [
        {
          title: 'تطوير مخبز آلي وحلواني نصف آلي (شارع فيصل)',
          category: 'مشروعات متوسطة إنتاجية',
          isCorporate: true,
          entityType: 'شركة ذات مسؤولية محدودة (ش.ذ.م.م)',
          city: 'الجيزة',
          amount: 85000,
          tenure: 18,
          rate: 23.0,
          rating: 'A',
          collateral: 'رهن آلات العجن والخبز + شيكات بنكية',
          baseRisk: 0.025,
          note: 'المخبز يوزع لـ 30 سوبر ماركت، تدفقات نقدية قوية.'
        },
        {
          title: 'تجهيز معمل تحاليل طبية بأجهزة رقمية (المعادي)',
          category: 'قطاع رعاية صحية ومختبرات',
          isCorporate: true,
          entityType: 'شركة مساهمة مصرية (ش.م.م)',
          city: 'القاهرة - المعادي',
          amount: 130000,
          tenure: 24,
          rate: 22.0,
          rating: 'AA',
          collateral: 'أجهزة طبية مستوردة + شيكات مؤجلة الدفع',
          baseRisk: 0.018,
          note: 'عائد ممتاز وثابت من تعاقدات شركات التأمين.'
        },
        {
          title: 'توسعة ورشة خراطة وتشكيل معادن (قليوب الصناعية)',
          category: 'صناعات مغذية هندسية',
          isCorporate: true,
          entityType: 'شركة تضامنية صناعية',
          city: 'القليوبية الصناعية',
          amount: 170000,
          tenure: 24,
          rate: 23.5,
          rating: 'BBB+',
          collateral: 'رهن مخرطة CNC كمبيوتر',
          baseRisk: 0.03,
          note: 'طلبات تصنيع مؤكدة لمصانع السيارات.'
        }
      ];
    } else if (tier.id === 3) {
      // Tier 3: Commercial Banking (800,000 to 4,000,000 EGP)
      pool = [
        {
          title: 'سلسلة صيدليات كبرى لتغطية توسعات القاهرة والإسكندرية',
          category: 'تمويل سلاسل إمداد وصيدلة',
          isCorporate: true,
          entityType: 'شركة مساهمة مصرية (ش.م.م)',
          city: 'القاهرة والإسكندرية',
          amount: 1800000,
          tenure: 24,
          rate: 21.5,
          rating: 'AA',
          collateral: 'محفظة شيكات نقدية وضمانات شخصية للشركاء',
          baseRisk: 0.02,
          note: 'تدفقات نقدية يومية مستقرة، قرض آمن جداً.'
        },
        {
          title: 'مصنع الأهرام للكيماويات والبلاستيك (العاشر من رمضان)',
          category: 'تمويل صناعي وتصدير',
          isCorporate: true,
          entityType: 'شركة مساهمة مصرية (ش.م.م)',
          city: 'العاشر من رمضان - الشرقية',
          amount: 2500000,
          tenure: 24,
          rate: 22.0,
          rating: 'A',
          collateral: 'رهن خطوط إنتاج ألمانية بقيمة 5 مليون ج.م',
          baseRisk: 0.025,
          note: 'موقف مالي قوي وعقود تصدير للدول المجاورة.'
        }
      ];
    } else {
      // Tier 4: Corporate Mega Loans (10M to 30M EGP)
      pool = [
        {
          title: 'شركة مصر للمقاولات والتطوير العمراني (العاصمة الإدارية)',
          category: 'تمويل مقاولات وبنية تحتية',
          isCorporate: true,
          entityType: 'شركة مساهمة مصرية كبرى مقيدة بالبورصة',
          city: 'العاصمة الإدارية الجديدة',
          amount: 15000000,
          tenure: 36,
          rate: 21.0,
          rating: 'AAA',
          collateral: 'خطابات ضمان معتمدة وعقود حكومية سيادية',
          baseRisk: 0.015,
          note: 'مشروع ذو حجم ائتماني عملاق وعائد سيادي.'
        }
      ];
    }

    // Pick 3-4 random applications
    const shuffled = pool.sort(() => 0.5 - Math.random());
    const count = Math.min(4, shuffled.length);

    for (let i = 0; i < count; i++) {
      const t = shuffled[i];
      const monthlyProfit = Math.round((t.amount * (t.rate / 100)) / 12);
      
      // Calculate realistic Egyptian I-Score Credit Bureau Score (350 - 850)
      let baseIScore = 700;
      if (t.rating.startsWith('AAA')) baseIScore = 815 + Math.floor(Math.random() * 30);
      else if (t.rating.startsWith('AA')) baseIScore = 760 + Math.floor(Math.random() * 45);
      else if (t.rating.startsWith('A')) baseIScore = 690 + Math.floor(Math.random() * 55);
      else if (t.rating.startsWith('BBB')) baseIScore = 590 + Math.floor(Math.random() * 70);
      else baseIScore = 510 + Math.floor(Math.random() * 60);

      const estimatedMonthlyIncome = Math.round((t.amount / t.tenure) * (2.2 + Math.random() * 1.2));
      const installment = Math.round(t.amount / t.tenure);
      const dbr = Math.min(50, Math.round((installment / estimatedMonthlyIncome) * 100));

      // Build official corporate documents dossier if applicant is a company
      const isCorporate = t.isCorporate || false;
      let commercialDossier = null;

      if (isCorporate) {
        const regNumber = 100000 + Math.floor(Math.random() * 899999);
        const taxId1 = 100 + Math.floor(Math.random() * 899);
        const taxId2 = 100 + Math.floor(Math.random() * 899);
        const taxId3 = 100 + Math.floor(Math.random() * 899);
        const annualRev = Math.round(t.amount * (3.5 + Math.random() * 2.0));
        const netProfit = Math.round(annualRev * (0.12 + Math.random() * 0.08));
        const operatingCash = Math.round(netProfit * 0.88);

        commercialDossier = {
          companyName: t.title,
          entityType: t.entityType || 'شركة مساهمة مصرية (ش.م.م)',
          commercialRegister: {
            regNumber: `س.ت ${regNumber} - مكتب سجل تجاري ${t.city || 'القاهرة'}`,
            capital: `${Math.round(t.amount * 2.5).toLocaleString('ar-EG')} ج.م`,
            validity: 'ساري المفعول حتى 2029/12',
            status: 'معتمد ومطابق للنشاط التجاري',
            statusClass: 'status-valid',
            activity: t.category
          },
          taxCard: {
            taxNumber: `${taxId1}-${taxId2}-${taxId3}`,
            taxOffice: `مأمورية ضرائب ${t.city || 'الاستثمار وكبار الممولين'}`,
            compliance: 'ملتزم بسداد الإقرارات السنوية وبلا قضايا تهرب',
            eInvoice: 'مسجل ومعتمد بمنظومة الفاتورة الإلكترونية الموحدة (ETA)',
            statusClass: 'status-valid'
          },
          balanceSheet: {
            auditor: t.auditor || 'مكتب المستشار المالي حازم حسن ومشاركوه (محاسب ومراقب حسابات مقيد)',
            fiscalYear: '2025/2024 المعتمدة',
            annualRevenue: `${annualRev.toLocaleString('ar-EG')} ج.م`,
            netProfit: `${netProfit.toLocaleString('ar-EG')} ج.م`,
            operatingCashFlow: `+${operatingCash.toLocaleString('ar-EG')} ج.م`,
            debtServiceRatio: '3.2x (تغطية ممتازة لخدمة الدين)',
            auditNotes: 'قوائم مالية نظيفة ومطابقة لمعايير المحاسبة المصرية (EAS)'
          },
          isAudited: false
        };
      }

      this.pendingApplications.push({
        id: `REQ-${Date.now().toString().slice(-4)}-${i+1}`,
        title: t.title,
        category: t.category,
        isCorporate: isCorporate,
        commercialDossier: commercialDossier,
        amount: t.amount,
        tenureMonths: t.tenure,
        annualRate: t.rate,
        monthlyProfit: monthlyProfit,
        creditRating: t.rating,
        iScore: baseIScore,
        monthlyIncome: estimatedMonthlyIncome,
        dbr: dbr,
        collateral: t.collateral,
        riskRatio: t.baseRisk,
        analystNote: t.note
      });
    }
  }

  approveLoan(reqId) {
    const idx = this.pendingApplications.findIndex(r => r.id === reqId);
    if (idx === -1) return { success: false, msg: 'طلب التمويل غير موجود.' };

    const req = this.pendingApplications[idx];

    // Check Treasury Liquidity
    if (this.state.treasuryCash < req.amount) {
      return { success: false, msg: `عفواً، لا توجد سيولة كافية بالخزينة. الرصيد الحالي: ${this.state.treasuryCash.toLocaleString('ar-EG')} ج.م.` };
    }

    // Disburse Loan
    this.state.treasuryCash -= req.amount;
    this.state.totalLoans += req.amount;

    this.activeLoans.push({
      id: req.id,
      title: req.title,
      category: req.category,
      amount: req.amount,
      balance: req.amount,
      tenureRemaining: req.tenureMonths,
      annualRate: req.annualRate,
      riskRatio: req.riskRatio,
      iScore: req.iScore,
      collateral: req.collateral,
      monthlyPayment: Math.round(req.amount / req.tenureMonths)
    });

    this.pendingApplications.splice(idx, 1);
    this.totalLoansDisbursedCount = (this.totalLoansDisbursedCount || 0) + 1;
    this.state.reputation = Math.min(100, this.state.reputation + 1);

    if (this.state.licensesManager && typeof this.state.licensesManager.addXP === 'function') {
      this.state.licensesManager.addXP(50, 'صرف تمويل جديد');
    }

    this.state.saveGame();

    return {
      success: true,
      msg: `تم صرف التمويل بنجاح بمبلغ ${req.amount.toLocaleString('ar-EG')} ج.م إلى: ${req.title}`
    };
  }

  negotiateLoan(reqId) {
    const idx = this.pendingApplications.findIndex(r => r.id === reqId);
    if (idx === -1) return { success: false, msg: 'طلب التمويل غير موجود.' };

    const req = this.pendingApplications[idx];

    // Check Treasury Liquidity
    if (this.state.treasuryCash < req.amount) {
      return { success: false, msg: `عفواً، لا توجد سيولة كافية بالخزينة. الرصيد الحالي: ${this.state.treasuryCash.toLocaleString('ar-EG')} ج.م.` };
    }

    // Raise interest rate by +2.5% and mitigate risk by 30% through demanding additional guarantor
    const boostedRate = parseFloat((req.annualRate + 2.5).toFixed(1));
    const mitigatedRisk = parseFloat((req.riskRatio * 0.7).toFixed(3));
    const newCollateral = `${req.collateral} + ضامن تضامني إضافي معتمد`;

    this.state.treasuryCash -= req.amount;
    this.state.totalLoans += req.amount;

    this.activeLoans.push({
      id: req.id,
      title: req.title,
      category: req.category,
      amount: req.amount,
      balance: req.amount,
      tenureRemaining: req.tenureMonths,
      annualRate: boostedRate,
      riskRatio: mitigatedRisk,
      iScore: req.iScore,
      collateral: newCollateral,
      monthlyPayment: Math.round(req.amount / req.tenureMonths)
    });

    this.pendingApplications.splice(idx, 1);
    this.totalLoansDisbursedCount = (this.totalLoansDisbursedCount || 0) + 1;
    this.state.reputation = Math.min(100, this.state.reputation + 1);

    if (this.state.licensesManager && typeof this.state.licensesManager.addXP === 'function') {
      this.state.licensesManager.addXP(50, 'صرف تمويل مع التفاوض');
    }

    this.state.saveGame();

    return {
      success: true,
      msg: `نجحت المفاوضة! تم رفع العائد إلى ${boostedRate}% سنوياً وتعزيز الضمانات وصرف التمويل بنجاح ⚖️`
    };
  }

  earlySettlement(loanId) {
    const idx = this.activeLoans.findIndex(l => l.id === loanId);
    if (idx === -1) return { success: false, msg: 'القرض غير موجود.' };

    const loan = this.activeLoans[idx];
    const settlementFee = Math.round(loan.balance * 0.02); // 2% early fee
    const totalCollected = loan.balance + settlementFee;

    this.state.treasuryCash += totalCollected;
    this.state.totalLoans = Math.max(0, this.state.totalLoans - loan.balance);
    this.activeLoans.splice(idx, 1);
    this.state.saveGame();

    return {
      success: true,
      msg: `تمت التسوية المبكرة للتمويل بنجاح! دخل الخزينة ${totalCollected.toLocaleString('ar-EG')} ج.م (شاملاً رسوم سداد مبكر ${settlementFee.toLocaleString('ar-EG')} ج.م).`
    };
  }

  addDirectLoan(loan) {
    if (!loan || !loan.amount) return;
    const tenure = loan.tenureMonths || 12;
    this.activeLoans.push({
      id: loan.id || (`LOAN-DIR-${Date.now()}`),
      title: loan.title || 'تمويل مباشر',
      category: loan.category || 'تسهيلات ائتمانية',
      amount: loan.amount,
      balance: loan.amount,
      tenureRemaining: tenure,
      annualRate: loan.annualRate || this.state.lendingAnnualRate,
      riskRatio: loan.riskRatio || 0.02,
      collateral: loan.collateral || 'ضمانات وتعهدات سداد معتمدة',
      monthlyPayment: Math.round(loan.amount / tenure)
    });
  }

  rejectLoan(reqId) {
    const idx = this.pendingApplications.findIndex(r => r.id === reqId);
    if (idx !== -1) {
      this.pendingApplications.splice(idx, 1);
      return { success: true, msg: 'تم رفض طلب التمويل لحماية محفظة البنك.' };
    }
    return { success: false, msg: 'الطلب غير موجود.' };
  }

  collectMonthlyPrincipals() {
    let principalCollected = 0;

    for (let i = this.activeLoans.length - 1; i >= 0; i--) {
      const loan = this.activeLoans[i];
      const monthlyPayment = Math.min(loan.balance, loan.monthlyPayment);
      loan.balance -= monthlyPayment;
      loan.tenureRemaining--;
      principalCollected += monthlyPayment;

      if (loan.balance <= 0 || loan.tenureRemaining <= 0) {
        this.activeLoans.splice(i, 1);
      }
    }

    return principalCollected;
  }

  calculateMonthlyDefaults() {
    let totalDefaultLoss = 0;
    const analystMitigation = this.state.hrManager ? this.state.hrManager.getRiskMitigationRatio() : 0.2;

    for (let i = this.activeLoans.length - 1; i >= 0; i--) {
      const loan = this.activeLoans[i];
      const effectiveRisk = loan.riskRatio * (1 - analystMitigation);
      if (Math.random() < effectiveRisk) {
        const loss = Math.round(loan.balance * 0.4);
        totalDefaultLoss += loss;
        this.defaultedHistory.push({
          title: loan.title,
          amount: loss,
          date: this.state.getDateString()
        });

        // Forward to Legal & Judicial Recovery
        if (this.state.legalManager) {
          this.state.legalManager.addDefaultedLoan({
            id: loan.id,
            borrower: loan.title,
            category: loan.category,
            amount: loan.balance,
            collateral: loan.collateral
          });
        }

        this.state.totalLoans = Math.max(0, this.state.totalLoans - loan.balance);
        this.activeLoans.splice(i, 1);
      }
    }

    return totalDefaultLoss;
  }

  auditCorporateLoan(reqId) {
    const app = this.pendingApplications.find(r => r.id === reqId);
    if (!app || !app.commercialDossier) {
      return { success: false, msg: 'طلب تمويل الشركة غير موجود أو لا يتضمن ملفاً تجارياً.' };
    }

    if (app.commercialDossier.isAudited) {
      return { success: false, msg: 'تم استيفاء وتدقيق مستندات هذا الملف التجاري مسبقاً.' };
    }

    // Conduct field audit: mitigate risk by 40% and boost credit score
    app.commercialDossier.isAudited = true;
    app.riskRatio = parseFloat((app.riskRatio * 0.6).toFixed(3));
    app.iScore = Math.min(850, app.iScore + 35);
    app.analystNote = `${app.analystNote} | [تم الفحص الميداني والمحاسبي بنجاح، وتأكيد صحة السجل التجاري والضرائب والميزانية]`;

    this.state.saveGame();

    return {
      success: true,
      msg: `تم الانتهاء من فحص وتدقيق المستندات القانونية لـ «${app.title}» بنجاح! انخفضت مخاطر التعثر بنسبة 40% وارتفعت الجدارة الائتمانية.`
    };
  }

  getState() {
    return {
      activeLoans: this.activeLoans,
      pendingApplications: this.pendingApplications,
      defaultedHistory: this.defaultedHistory,
      totalLoansDisbursedCount: this.totalLoansDisbursedCount || 0
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.activeLoans && Array.isArray(data.activeLoans)) {
      this.activeLoans = data.activeLoans;
    }
    if (data.pendingApplications && Array.isArray(data.pendingApplications)) {
      this.pendingApplications = data.pendingApplications;
    }
    if (data.defaultedHistory && Array.isArray(data.defaultedHistory)) {
      this.defaultedHistory = data.defaultedHistory;
    }
    if (typeof data.totalLoansDisbursedCount === 'number') {
      this.totalLoansDisbursedCount = data.totalLoansDisbursedCount;
    }
  }
}
