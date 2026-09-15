import { AudioFX } from './systems/AudioFX.js';
import { GameState } from './models/GameState.js';
import { LoansManager } from './models/LoansManager.js';
import { HRManager } from './models/HRManager.js';
import { BranchesManager } from './models/BranchesManager.js';
import { EventsManager } from './models/EventsManager.js';
import { InvestmentsManager } from './models/InvestmentsManager.js';
import { IslamicBankingManager } from './models/IslamicBankingManager.js';
import { CardsManager } from './models/CardsManager.js';
import { ComplianceManager } from './models/ComplianceManager.js';
import { CSRManager } from './models/CSRManager.js';
import { CompetitorsManager } from './models/CompetitorsManager.js';
import { InstaPayManager } from './models/InstaPayManager.js';
import { TreasuryProductsManager } from './models/TreasuryProductsManager.js';
import { NewsManager } from './models/NewsManager.js';
import { FXManager } from './models/FXManager.js';
import { LegalManager } from './models/LegalManager.js';
import { TrophiesManager } from './models/TrophiesManager.js';
import { CareerProgressionManager } from './models/CareerProgressionManager.js';
import { BankRunManager } from './models/BankRunManager.js';
import { NeoBankManager } from './models/NeoBankManager.js';
import { VendorsManager } from './models/VendorsManager.js';
import { ExecutiveLifeManager } from './models/ExecutiveLifeManager.js';
import { LicensesManager } from './models/LicensesManager.js';
import { UIManager } from './ui/UIManager.js';

// Bootstrapping the Egyptian Bank Tycoon application
window.addEventListener('DOMContentLoaded', () => {
  const audio = new AudioFX();
  const gameState = new GameState();

  // Initialize Subsystems
  const loansManager = new LoansManager(gameState);
  const hrManager = new HRManager(gameState);
  const branchesManager = new BranchesManager(gameState);
  const eventsManager = new EventsManager();
  const investmentsManager = new InvestmentsManager(gameState);
  const islamicBankingManager = new IslamicBankingManager(gameState);
  const cardsManager = new CardsManager(gameState);
  const complianceManager = new ComplianceManager(gameState);
  const csrManager = new CSRManager(gameState);
  const competitorsManager = new CompetitorsManager(gameState);
  const instaPayManager = new InstaPayManager(gameState);
  const treasuryProductsManager = new TreasuryProductsManager(gameState);
  const newsManager = new NewsManager(gameState);
  const fxManager = new FXManager(gameState);
  const legalManager = new LegalManager(gameState);
  const trophiesManager = new TrophiesManager(gameState);
  const careerManager = new CareerProgressionManager(gameState);
  const bankRunManager = new BankRunManager(gameState);
  const neoBankManager = new NeoBankManager(gameState);
  const vendorsManager = new VendorsManager(gameState);
  const executiveLifeManager = new ExecutiveLifeManager(gameState);
  const licensesManager = new LicensesManager(gameState);

  // Cross-reference managers in central state
  gameState.loansManager = loansManager;
  gameState.hrManager = hrManager;
  gameState.branchesManager = branchesManager;
  gameState.eventsManager = eventsManager;
  gameState.investmentsManager = investmentsManager;
  gameState.islamicBankingManager = islamicBankingManager;
  gameState.cardsManager = cardsManager;
  gameState.complianceManager = complianceManager;
  gameState.csrManager = csrManager;
  gameState.competitorsManager = competitorsManager;
  gameState.instaPayManager = instaPayManager;
  gameState.treasuryProductsManager = treasuryProductsManager;
  gameState.newsManager = newsManager;
  gameState.fxManager = fxManager;
  gameState.legalManager = legalManager;
  gameState.trophiesManager = trophiesManager;
  gameState.careerManager = careerManager;
  gameState.careerProgression = careerManager;
  gameState.bankRunManager = bankRunManager;
  gameState.neoBankManager = neoBankManager;
  gameState.vendorsManager = vendorsManager;
  gameState.executiveLifeManager = executiveLifeManager;
  gameState.licensesManager = licensesManager;

  // Load persisted states into subsystems
  gameState.loadSubsystemsState();

  // Initialize UI
  new UIManager(gameState, audio);
});
