import { Card } from '../../src/entities/card.entity';
import { Folder } from '../../src/entities/folder.entity';
import { User } from '../../src/entities/user.entity';
import { AppDataSource } from '../../src/utils/dataSource';
import { FolderFixture } from './folder.fixture';
import { UserFixture } from './user.fixture';

/**
 * Card fixture for creating test cards
 */
export class CardFixture {
	/**
	 * Create a card with default values
	 * @param user - The user who owns the card
	 * @param folder - The folder that contains the card
	 * @param overrides - Optional properties to override default values
	 * @returns A card entity instance
	 */
	static createCard(
		user: User,
		folder: Folder,
		overrides: Partial<Card> = {}
	): Card {
		const card = new Card();
		card.word = overrides.word || 'Test Word';
		card.translation = overrides.translation || 'Test Translation';
		card.sentence =
			overrides.sentence || 'This is a test sentence with the test word.';
		card.image = overrides.image || 'https://example.com/test-image.jpg';
		card.user = user;
		card.folder = folder;

		return card;
	}

	/**
	 * Create and save a card to the database
	 * @param user - The user who owns the card
	 * @param folder - The folder that contains the card
	 * @param overrides - Optional properties to override default values
	 * @returns A saved card entity
	 */
	static async createAndSaveCard(
		user: User,
		folder: Folder,
		overrides: Partial<Card> = {}
	): Promise<Card> {
		const card = CardFixture.createCard(user, folder, overrides);
		const cardRepository = AppDataSource.getRepository(Card);
		return await cardRepository.save(card);
	}

	/**
	 * Create multiple cards with default values
	 * @param user - The user who owns the cards
	 * @param folder - The folder that contains the cards
	 * @param count - Number of cards to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of card entity instances
	 */
	static createCards(
		user: User,
		folder: Folder,
		count: number,
		overrides: Partial<Card> = {}
	): Card[] {
		return Array.from({ length: count }, (_, index) =>
			CardFixture.createCard(user, folder, {
				...overrides,
				word: overrides.word
					? `${overrides.word} ${index + 1}`
					: `Test Word ${index + 1}`,
				translation: overrides.translation
					? `${overrides.translation} ${index + 1}`
					: `Test Translation ${index + 1}`,
			})
		);
	}

	/**
	 * Create and save multiple cards to the database
	 * @param user - The user who owns the cards
	 * @param folder - The folder that contains the cards
	 * @param count - Number of cards to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of saved card entities
	 */
	static async createAndSaveCards(
		user: User,
		folder: Folder,
		count: number,
		overrides: Partial<Card> = {}
	): Promise<Card[]> {
		const cards = CardFixture.createCards(user, folder, count, overrides);
		const cardRepository = AppDataSource.getRepository(Card);
		return await cardRepository.save(cards);
	}

	/**
	 * Create a card with a new user and folder
	 * @param userOverrides - Optional properties to override default user values
	 * @param folderOverrides - Optional properties to override default folder values
	 * @param cardOverrides - Optional properties to override default card values
	 * @returns An object containing the created user, folder, and card
	 */
	static async createCardWithNewUserAndFolder(
		userOverrides: Partial<User> = {},
		folderOverrides: Partial<Folder> = {},
		cardOverrides: Partial<Card> = {}
	): Promise<{ user: User; folder: Folder; card: Card }> {
		const { user, folder } = await FolderFixture.createFolderWithNewUser(
			userOverrides,
			folderOverrides
		);
		const card = await CardFixture.createAndSaveCard(
			user,
			folder,
			cardOverrides
		);
		return { user, folder, card };
	}

	/**
	 * Create multiple cards with a new user and folder
	 * @param count - Number of cards to create
	 * @param userOverrides - Optional properties to override default user values
	 * @param folderOverrides - Optional properties to override default folder values
	 * @param cardOverrides - Optional properties to override default card values
	 * @returns An object containing the created user, folder, and cards
	 */
	static async createCardsWithNewUserAndFolder(
		count: number,
		userOverrides: Partial<User> = {},
		folderOverrides: Partial<Folder> = {},
		cardOverrides: Partial<Card> = {}
	): Promise<{ user: User; folder: Folder; cards: Card[] }> {
		const { user, folder } = await FolderFixture.createFolderWithNewUser(
			userOverrides,
			folderOverrides
		);
		const cards = await CardFixture.createAndSaveCards(
			user,
			folder,
			count,
			cardOverrides
		);
		return { user, folder, cards };
	}

	/**
	 * Create a complete test setup with a user, multiple folders, and multiple cards per folder
	 * @param folderCount - Number of folders to create
	 * @param cardsPerFolder - Number of cards to create per folder
	 * @param userOverrides - Optional properties to override default user values
	 * @param folderOverrides - Optional properties to override default folder values
	 * @param cardOverrides - Optional properties to override default card values
	 * @returns An object containing the created user, folders, and cards
	 */
	static async createCompleteTestSetup(
		folderCount: number = 2,
		cardsPerFolder: number = 3,
		userOverrides: Partial<User> = {},
		folderOverrides: Partial<Folder> = {},
		cardOverrides: Partial<Card> = {}
	): Promise<{ user: User; folders: Folder[]; cards: Card[] }> {
		const user = await UserFixture.createAndSaveUser(userOverrides);
		const folders = await FolderFixture.createAndSaveFolders(
			user,
			folderCount,
			folderOverrides
		);

		const allCards: Card[] = [];
		for (const folder of folders) {
			const cards = await CardFixture.createAndSaveCards(
				user,
				folder,
				cardsPerFolder,
				cardOverrides
			);
			allCards.push(...cards);
		}

		return { user, folders, cards: allCards };
	}
}
