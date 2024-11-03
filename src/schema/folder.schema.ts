import { z } from 'zod';

export const createFolderSchema = z.object({
	body: z.object({
		name: z.string().min(1, 'Folder name is required'),
		description: z.string().optional(),
	}),
});

export const updateFolderSchema = z.object({
	params: z.object({
		folderId: z.string().uuid('Invalid folder ID format'),
	}),
	body: z.object({
		name: z.string().min(1, 'Folder name is required').optional(),
		description: z.string().optional(),
	}),
});

export const deleteFolderSchema = z.object({
	folderId: z.string().uuid('Invalid folder ID format'),
});

export const getFolderSchema = z.object({
	folderId: z.string().uuid('Invalid folder ID format'),
});

export const getFoldersSchema = z.object({
	search: z.string().optional(),
	skip: z.number().optional(),
	take: z.number().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type DeleteFolderInput = z.infer<typeof deleteFolderSchema>;
export type GetFolderInput = z.infer<typeof getFolderSchema>;
export type GetFoldersInput = z.infer<typeof getFoldersSchema>;
