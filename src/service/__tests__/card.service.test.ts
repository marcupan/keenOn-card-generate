import { CardService } from '../card.service';
import { Card, Folder, User } from '../../entities';
import { ErrorCode } from '../../types/error';
import composeClient from '../../utils/composeClient';
import translationClient from '../../utils/translationClient';
import * as grpc from '@grpc/grpc-js';
import { cardRepository } from '../../repository/card.repository';
import { AppError, DatabaseError, NotFoundError } from '../../utils/appError';
import { cacheService, CacheTTL } from '../../utils/cacheService';

// Mock dependencies
jest.mock('@repository/card.repository');
jest.mock('@utils/cacheService');
jest.mock('../../utils/composeClient');
jest.mock('../../utils/translationClient');
jest.mock('../../utils/container');

describe('CardService', () => {
	let cardService: CardService;
	let mockCard: Partial<Card>;
	let mockUser: Partial<User>;
	let mockFolder: Partial<Folder>;

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Create mock data
		mockCard = {
			id: '1',
			word: '你好',
			translation: 'Hello',
			sentence: 'Hello, how are you?',
			image: 'data:image/png;base64,abc123',
			created_at: new Date(),
			updated_at: new Date(),
		};

		mockUser = {
			id: 'user1',
			name: 'Test User',
			email: 'test@example.com',
		};

		mockFolder = {
			id: 'folder1',
			name: 'Test Folder',
			description: 'A test folder',
		};

		// Create the service instance
		cardService = new CardService();
	});

	describe('create', () => {
		it('should create a card successfully', async () => {
			// Arrange
			const cardData = {
				word: '你好',
				translation: 'Hello',
				sentence: 'Hello, how are you?',
			};
			const createdCard = { ...cardData, id: '2' } as Card;
			(cardRepository.create as jest.Mock).mockResolvedValue(createdCard);

			// Act
			const result = await cardService.create(cardData);

			// Assert
			expect(result).toEqual(createdCard);
			expect(cardRepository.create).toHaveBeenCalledWith(cardData);
		});

		it('should throw DatabaseError if creation fails', async () => {
			// Arrange
			const cardData = {
				word: '你好',
				translation: 'Hello',
				sentence: 'Hello, how are you?',
			};
			const error = new Error('Database error');
			(cardRepository.create as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(cardService.create(cardData)).rejects.toThrow(
				DatabaseError
			);
			expect(cardRepository.create).toHaveBeenCalledWith(cardData);
		});
	});

	describe('findById', () => {
		it('should find a card by ID successfully', async () => {
			// Arrange
			const cardId = '1';
			(cardRepository.findById as jest.Mock).mockResolvedValue(mockCard);

			// Act
			const result = await cardService.findById(cardId);

			// Assert
			expect(result).toEqual(mockCard);
			expect(cardRepository.findById).toHaveBeenCalledWith(cardId);
		});

		it('should return null if card is not found', async () => {
			// Arrange
			const cardId = 'nonexistent';
			(cardRepository.findById as jest.Mock).mockResolvedValue(null);

			// Act
			const result = await cardService.findById(cardId);

			// Assert
			expect(result).toBeNull();
			expect(cardRepository.findById).toHaveBeenCalledWith(cardId);
		});

		it('should throw DatabaseError if findById fails', async () => {
			// Arrange
			const cardId = '1';
			const error = new Error('Database error');
			(cardRepository.findById as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(cardService.findById(cardId)).rejects.toThrow(
				DatabaseError
			);
			expect(cardRepository.findById).toHaveBeenCalledWith(cardId);
		});
	});

	describe('update', () => {
		it('should update a card successfully', async () => {
			// Arrange
			const cardId = '1';
			const updateData = { translation: 'Updated Translation' };
			const updatedCard = { ...mockCard, ...updateData };
			(cardRepository.update as jest.Mock).mockResolvedValue(updatedCard);

			// Act
			const result = await cardService.update(cardId, updateData);

			// Assert
			expect(result).toEqual(updatedCard);
			expect(cardRepository.update).toHaveBeenCalledWith(
				cardId,
				updateData
			);
		});

		it('should throw NotFoundError if card is not found during update', async () => {
			// Arrange
			const cardId = 'nonexistent';
			const updateData = { translation: 'Updated Translation' };
			const error = new NotFoundError('Card not found');
			(cardRepository.update as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(
				cardService.update(cardId, updateData)
			).rejects.toThrow(NotFoundError);
			expect(cardRepository.update).toHaveBeenCalledWith(
				cardId,
				updateData
			);
		});

		it('should throw DatabaseError for other errors during update', async () => {
			// Arrange
			const cardId = '1';
			const updateData = { translation: 'Updated Translation' };
			const error = new Error('Database error');
			(cardRepository.update as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(
				cardService.update(cardId, updateData)
			).rejects.toThrow(DatabaseError);
			expect(cardRepository.update).toHaveBeenCalledWith(
				cardId,
				updateData
			);
		});
	});

	describe('delete', () => {
		it('should delete a card successfully', async () => {
			// Arrange
			const cardId = '1';
			(cardRepository.delete as jest.Mock).mockResolvedValue(true);

			// Act
			const result = await cardService.delete(cardId);

			// Assert
			expect(result).toBe(true);
			expect(cardRepository.delete).toHaveBeenCalledWith(cardId);
		});

		it('should throw DatabaseError if deletion fails', async () => {
			// Arrange
			const cardId = '1';
			const error = new Error('Database error');
			(cardRepository.delete as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(cardService.delete(cardId)).rejects.toThrow(
				DatabaseError
			);
			expect(cardRepository.delete).toHaveBeenCalledWith(cardId);
		});
	});

	describe('createCard', () => {
		it('should create a card with user and folder successfully', async () => {
			// Arrange
			const cardData = {
				word: '你好',
				translation: 'Hello',
				sentence: 'Hello, how are you?',
			};
			const createdCard = {
				...cardData,
				id: '2',
				user: mockUser,
				folder: mockFolder,
			} as Card;
			(cardRepository.createWithRelations as jest.Mock).mockResolvedValue(
				createdCard
			);

			// Act
			const result = await cardService.createCard(
				cardData,
				mockUser as User,
				mockFolder as Folder
			);

			// Assert
			expect(result).toEqual(createdCard);
			expect(cardRepository.createWithRelations).toHaveBeenCalledWith(
				cardData,
				mockUser,
				mockFolder
			);
		});

		it('should create a card with user but without folder successfully', async () => {
			// Arrange
			const cardData = {
				word: '你好',
				translation: 'Hello',
				sentence: 'Hello, how are you?',
			};
			const createdCard = {
				...cardData,
				id: '2',
				user: mockUser,
			} as Card;
			(cardRepository.createWithRelations as jest.Mock).mockResolvedValue(
				createdCard
			);

			// Act
			const result = await cardService.createCard(
				cardData,
				mockUser as User
			);

			// Assert
			expect(result).toEqual(createdCard);
			expect(cardRepository.createWithRelations).toHaveBeenCalledWith(
				cardData,
				mockUser,
				undefined
			);
		});

		it('should throw DatabaseError if creation with relations fails', async () => {
			// Arrange
			const cardData = {
				word: '你好',
				translation: 'Hello',
				sentence: 'Hello, how are you?',
			};
			const error = new Error('Database error');
			(cardRepository.createWithRelations as jest.Mock).mockRejectedValue(
				error
			);

			// Act & Assert
			await expect(
				cardService.createCard(
					cardData,
					mockUser as User,
					mockFolder as Folder
				)
			).rejects.toThrow(DatabaseError);
			expect(cardRepository.createWithRelations).toHaveBeenCalledWith(
				cardData,
				mockUser,
				mockFolder
			);
		});
	});

	describe('findCards', () => {
		it('should find cards with relations and pagination successfully', async () => {
			// Arrange
			const options = { skip: 0, take: 10 };
			const cards = [mockCard] as Card[];
			(cardRepository.findWithRelations as jest.Mock).mockResolvedValue(
				cards
			);
			(cacheService.getOrSet as jest.Mock).mockImplementation(
				(_key, callback) => callback()
			);

			// Act
			const result = await cardService.findCards(options);

			// Assert
			expect(result).toEqual(cards);
			expect(cacheService.getOrSet).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Function),
				CacheTTL.MEDIUM
			);
			expect(cardRepository.findWithRelations).toHaveBeenCalledWith(
				options
			);
		});

		it('should throw DatabaseError if finding cards fails', async () => {
			// Arrange
			const options = { skip: 0, take: 10 };
			const error = new Error('Database error');
			(cardRepository.findWithRelations as jest.Mock).mockRejectedValue(
				error
			);
			(cacheService.getOrSet as jest.Mock).mockImplementation(
				(_key, callback) => callback()
			);

			// Act & Assert
			await expect(cardService.findCards(options)).rejects.toThrow(
				DatabaseError
			);
			expect(cacheService.getOrSet).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Function),
				CacheTTL.MEDIUM
			);
		});
	});

	describe('generateCard', () => {
		it('should generate a card successfully', async () => {
			// Arrange
			const input = {
				word: '你好',
				imageBase64: 'data:image/png;base64,abc123',
			};

			const translationResponse = {
				translation: 'Hello',
				individualTranslations: ['you', 'good'],
				exampleSentences: ['Hello, how are you?'],
			};

			const composeResponse = {
				composedImage: Buffer.from('composed-image-data'),
			};

			(translationClient.Translate as jest.Mock).mockResolvedValue(
				translationResponse
			);
			(composeClient.ComposeImage as jest.Mock).mockResolvedValue(
				composeResponse
			);

			// Act
			const result = await cardService.generateCard(input);

			// Assert
			expect(result).toEqual({
				image: 'data:image/png;base64,Y29tcG9zZWQtaW1hZ2UtZGF0YQ==',
				translation: 'Hello',
				characterBreakdown: ['you', 'good'],
				exampleSentences: ['Hello, how are you?'],
			});

			expect(translationClient.Translate).toHaveBeenCalledWith({
				chineseWord: input.word,
			});

			expect(composeClient.ComposeImage).toHaveBeenCalledWith({
				imageBase64: 'abc123',
				translation: 'Hello',
				individualTranslations: ['you', 'good'],
				exampleSentences: ['Hello, how are you?'],
			});
		});

		it('should throw AppError if word is missing', async () => {
			// Arrange
			const input = {
				word: '',
				imageBase64: 'data:image/png;base64,abc123',
			};

			// Act & Assert
			await expect(cardService.generateCard(input)).rejects.toThrow(
				AppError
			);
			await expect(cardService.generateCard(input)).rejects.toMatchObject(
				{
					code: ErrorCode.BAD_REQUEST,
					statusCode: 400,
				}
			);
		});

		it('should throw AppError if imageBase64 is invalid', async () => {
			// Arrange
			const input = {
				word: '你好',
				imageBase64: 'invalid-data',
			};

			// Act & Assert
			await expect(cardService.generateCard(input)).rejects.toThrow(
				AppError
			);
			await expect(cardService.generateCard(input)).rejects.toMatchObject(
				{
					code: ErrorCode.BAD_REQUEST,
					statusCode: 400,
				}
			);
		});

		it('should throw AppError if translation service returns NOT_FOUND', async () => {
			// Arrange
			const input = {
				word: '你好',
				imageBase64: 'data:image/png;base64,abc123',
			};

			const grpcError = {
				code: grpc.status.NOT_FOUND,
				details: 'Word not found',
			};

			(translationClient.Translate as jest.Mock).mockRejectedValue(
				grpcError
			);

			// Act & Assert
			await expect(cardService.generateCard(input)).rejects.toThrow(
				AppError
			);
			await expect(cardService.generateCard(input)).rejects.toMatchObject(
				{
					code: ErrorCode.NOT_FOUND,
					statusCode: 404,
				}
			);
		});

		it('should throw AppError if image composition service fails to produce an image', async () => {
			// Arrange
			const input = {
				word: '你好',
				imageBase64: 'data:image/png;base64,abc123',
			};

			const translationResponse = {
				translation: 'Hello',
				individualTranslations: ['you', 'good'],
				exampleSentences: ['Hello, how are you?'],
			};

			const composeResponse = {
				composedImage: new Uint8Array(0), // Empty image
			};

			(translationClient.Translate as jest.Mock).mockResolvedValue(
				translationResponse
			);
			(composeClient.ComposeImage as jest.Mock).mockResolvedValue(
				composeResponse
			);

			// Act & Assert
			await expect(cardService.generateCard(input)).rejects.toThrow(
				AppError
			);
			await expect(cardService.generateCard(input)).rejects.toMatchObject(
				{
					code: ErrorCode.INTERNAL_SERVER_ERROR,
					statusCode: 500,
				}
			);
		});
	});
});
