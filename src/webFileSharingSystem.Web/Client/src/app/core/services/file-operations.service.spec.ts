import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AppFile } from '../models/app-file.model';
import { BaseFile, FileStatus } from '../models/base-file.model';
import { ActionType } from '../models/action-type.model';
import { MessageSeverity } from '../models/toast-info.model';
import { SharedFile } from '../models/shared-file.model';
import { FileApiService } from './api/file-api.service';
import { FileOperationsService } from './file-operations.service';
import { FileViewMode, FileViewService } from './file-view.service';
import { ModalService } from './modal.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

function createBaseFile(
  id: number,
  fileName: string,
  overrides: Partial<BaseFile> = {},
): BaseFile {
  return {
    id,
    parentId: null,
    fileName,
    mimeType: null,
    size: 10,
    isDirectory: false,
    fileStatus: FileStatus.Completed,
    progressStatus: null,
    partialFileInfo: null,
    uploadProgress: null,
    createdBy: 1,
    createdByUserName: 'Test user',
    ...overrides,
  };
}

function createAppFile(
  id: number,
  fileName: string,
  overrides: Partial<AppFile> = {},
): AppFile {
  return {
    ...createBaseFile(id, fileName, overrides),
    isFavourite: false,
    isShared: false,
    sharedUntil: null,
    modificationDate: '2026-01-01',
    ...overrides,
  };
}

function createSharedFile(
  id: number,
  fileName: string,
  overrides: Partial<SharedFile> = {},
): SharedFile {
  return {
    ...createBaseFile(id, fileName, overrides),
    userId: 2,
    shareId: null,
    sharedUserName: 'Shared user',
    sharedUserPhotoUrl: null,
    ...overrides,
  };
}

describe('FileOperationsService', () => {
  let service: FileOperationsService;
  let mode: ReturnType<typeof signal<FileViewMode>>;
  let userFiles: ReturnType<typeof signal<AppFile[]>>;
  let sharedFiles: ReturnType<typeof signal<SharedFile[]>>;
  let parentId: ReturnType<typeof signal<number | null>>;
  let parentName: ReturnType<typeof signal<string | undefined>>;
  let renameResult: ReturnType<FileApiService['renameFile']>;
  let favouriteResult: (
    fileId: number,
    isFavourite: boolean,
  ) => ReturnType<FileApiService['setFavourite']>;
  let createDirectoryResult: ReturnType<FileApiService['createDirectory']>;
  let copyFilesResult: ReturnType<FileApiService['copyFiles']>;
  let moveFilesResult: ReturnType<FileApiService['moveFiles']>;
  let deleteResult: (fileId: number) => ReturnType<FileApiService['deleteFile']>;
  let renameFile: FileApiService['renameFile'];
  let setFavourite: FileApiService['setFavourite'];
  let createDirectory: FileApiService['createDirectory'];
  let copyFiles: FileApiService['copyFiles'];
  let moveFiles: FileApiService['moveFiles'];
  let deleteFile: FileApiService['deleteFile'];
  let confirmationResult: Promise<boolean>;
  let confirmChoice: ModalService['confirmChoice'];
  let reloadCurrentList: FileViewService['reloadCurrentList'];
  let updateCurrentUserUsedSpace: StorageService['updateCurrentUserUsedSpace'];
  let showToast: ToastService['show'];

  beforeEach(() => {
    mode = signal<FileViewMode>('GetAll');
    userFiles = signal<AppFile[]>([]);
    sharedFiles = signal<SharedFile[]>([]);
    parentId = signal<number | null>(null);
    parentName = signal<string | undefined>(undefined);
    renameResult = of({});
    favouriteResult = () => of({});
    createDirectoryResult = of(createAppFile(100, 'New directory'));
    copyFilesResult = of([]);
    moveFilesResult = of([]);
    deleteResult = () => of({});
    confirmationResult = Promise.resolve(true);

    const currentFiles = computed<(AppFile | SharedFile)[]>(() =>
      mode() === 'GetSharedWithMe' ? sharedFiles() : userFiles(),
    );
    reloadCurrentList = vi.fn<FileViewService['reloadCurrentList']>();
    const fileViewDouble = {
      userFiles: userFiles.asReadonly(),
      sharedFiles: sharedFiles.asReadonly(),
      currentFiles,
      mode: mode.asReadonly(),
      parentId: parentId.asReadonly(),
      parentName: parentName.asReadonly(),
      updateUserFile: (fileId: number, updates: Partial<AppFile>) => {
        userFiles.update((files) =>
          files.map((file) =>
            file.id === fileId ? { ...file, ...updates } : file,
          ),
        );
      },
      updateSharedFile: (fileId: number, updates: Partial<SharedFile>) => {
        sharedFiles.update((files) =>
          files.map((file) =>
            file.id === fileId ? { ...file, ...updates } : file,
          ),
        );
      },
      addUserFileIfNotExists: (file: AppFile) => {
        if (userFiles().some((current) => current.id === file.id)) return;
        userFiles.update((files) => [...files, file]);
      },
      addSharedFileIfNotExists: (file: SharedFile) => {
        if (sharedFiles().some((current) => current.id === file.id)) return;
        sharedFiles.update((files) => [...files, file]);
      },
      removeUserFiles: (fileIds: ReadonlySet<number>) => {
        userFiles.update((files) =>
          files.filter((file) => !fileIds.has(file.id)),
        );
      },
      removeSharedFiles: (fileIds: ReadonlySet<number>) => {
        sharedFiles.update((files) =>
          files.filter((file) => !fileIds.has(file.id)),
        );
      },
      reloadCurrentList,
    } satisfies Pick<
      FileViewService,
      | 'userFiles'
      | 'sharedFiles'
      | 'currentFiles'
      | 'mode'
      | 'parentId'
      | 'parentName'
      | 'updateUserFile'
      | 'updateSharedFile'
      | 'addUserFileIfNotExists'
      | 'addSharedFileIfNotExists'
      | 'removeUserFiles'
      | 'removeSharedFiles'
      | 'reloadCurrentList'
    >;

    renameFile = vi.fn(
      (_fileId: number, _newFileName: string) => renameResult,
    );
    setFavourite = vi.fn(
      (fileId: number, isFavourite: boolean) =>
        favouriteResult(fileId, isFavourite),
    );
    createDirectory = vi.fn(
      (_name: string, _parentId: number | null) => createDirectoryResult,
    );
    copyFiles = vi.fn(
      (_fileIds: number[], _targetId: number | null) => copyFilesResult,
    );
    moveFiles = vi.fn(
      (_fileIds: number[], _targetId: number | null) => moveFilesResult,
    );
    deleteFile = vi.fn((fileId: number) => deleteResult(fileId));
    confirmChoice = vi.fn<ModalService['confirmChoice']>(
      () => confirmationResult,
    );
    updateCurrentUserUsedSpace =
      vi.fn<StorageService['updateCurrentUserUsedSpace']>();
    showToast = vi.fn<ToastService['show']>();

    const storageDouble: Pick<StorageService, 'updateCurrentUserUsedSpace'> = {
      updateCurrentUserUsedSpace,
    };

    TestBed.configureTestingModule({
      providers: [
        FileOperationsService,
        { provide: FileViewService, useValue: fileViewDouble },
        {
          provide: FileApiService,
          useValue: {
            renameFile,
            setFavourite,
            createDirectory,
            copyFiles,
            moveFiles,
            deleteFile,
          } satisfies Pick<
            FileApiService,
            | 'renameFile'
            | 'setFavourite'
            | 'createDirectory'
            | 'copyFiles'
            | 'moveFiles'
            | 'deleteFile'
          >,
        },
        { provide: StorageService, useValue: storageDouble },
        {
          provide: ToastService,
          useValue: { show: showToast } satisfies Pick<ToastService, 'show'>,
        },
        {
          provide: ModalService,
          useValue: { confirmChoice } satisfies Pick<
            ModalService,
            'confirmChoice'
          >,
        },
      ],
    });

    service = TestBed.inject(FileOperationsService);
  });

  it('starts with empty action and loading state', () => {
    expect(service.awaitingActionState()).toBeNull();
    expect(service.editingId()).toBeNull();
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('adds and removes loading IDs independently', () => {
    service.setLoading(10, true);
    service.setLoading(20, true);
    expect(service.loadingIds()).toEqual(new Set([10, 20]));

    service.setLoading(10, false);

    expect(service.loadingIds()).toEqual(new Set([20]));
  });

  it('trims a valid rename and updates a user file after the request succeeds', () => {
    const file = createAppFile(1, 'old-name.txt');
    const response = new Subject<object>();
    renameResult = response.asObservable();
    userFiles.set([file]);
    service.editingId.set(file.id);

    service.renameFileWithFeedback(file, '  new-name.txt  ');

    expect(renameFile).toHaveBeenCalledWith(file.id, 'new-name.txt');
    expect(service.editingId()).toBeNull();
    expect(service.loadingIds()).toEqual(new Set([file.id]));
    expect(userFiles()[0].fileName).toBe('old-name.txt');

    response.next({});

    expect(userFiles()[0].fileName).toBe('new-name.txt');
    expect(showToast).toHaveBeenCalledWith(
      'File rename',
      'File renamed successfully',
      MessageSeverity.success,
    );
    expect(service.loadingIds()).toEqual(new Set([file.id]));

    response.complete();

    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('rejects an empty rename without calling the API', () => {
    const file = createAppFile(1, 'old-name.txt');

    service.renameFileWithFeedback(file, '   ');

    expect(renameFile).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(showToast).toHaveBeenCalledWith(
      'File rename',
      'File name cannot be empty',
      MessageSeverity.error,
    );
  });

  it('rejects a duplicate name without calling the API', () => {
    const file = createAppFile(1, 'old-name.txt');
    userFiles.set([file, createAppFile(2, 'existing.txt')]);

    service.renameFileWithFeedback(file, 'existing.txt');

    expect(renameFile).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(showToast).toHaveBeenCalledWith(
      'File rename',
      'File with this name already exists',
      MessageSeverity.error,
    );
  });

  it('updates a shared file when its rename succeeds in the shared view', () => {
    const file = createSharedFile(3, 'shared-old.txt');
    mode.set('GetSharedWithMe');
    sharedFiles.set([file]);

    service.renameFileWithFeedback(file, 'shared-new.txt');

    expect(renameFile).toHaveBeenCalledWith(file.id, 'shared-new.txt');
    expect(sharedFiles()[0].fileName).toBe('shared-new.txt');
    expect(userFiles()).toEqual([]);
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(showToast).toHaveBeenCalledWith(
      'File rename',
      'File renamed successfully',
      MessageSeverity.success,
    );
  });

  it('reports a rename failure and clears loading state', () => {
    const file = createAppFile(4, 'old-name.txt');
    renameResult = throwError(() => ({ error: 'Rename was rejected' }));

    service.renameFileWithFeedback(file, 'new-name.txt');

    expect(renameFile).toHaveBeenCalledWith(file.id, 'new-name.txt');
    expect(showToast).toHaveBeenCalledWith(
      'File rename',
      'Rename was rejected',
      MessageSeverity.error,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('updates only eligible favourites and handles an individual failure', () => {
    const pendingSuccess = new Subject<object>();
    const successfulFile = createAppFile(10, 'successful.txt');
    const alreadyFavourite = createAppFile(11, 'already-favourite.txt', {
      isFavourite: true,
    });
    const incompleteFile = createAppFile(12, 'incomplete.txt', {
      fileStatus: FileStatus.Incomplete,
    });
    const failedFile = createAppFile(13, 'failed.txt');
    const files = [
      successfulFile,
      alreadyFavourite,
      incompleteFile,
      failedFile,
    ];
    userFiles.set(files);
    favouriteResult = (fileId) =>
      fileId === successfulFile.id
        ? pendingSuccess.asObservable()
        : throwError(() => ({ error: 'Favourite update failed on server' }));

    service.changeFilesFavouriteWithFeedback(files, true);

    expect(setFavourite).toHaveBeenCalledTimes(2);
    expect(setFavourite).toHaveBeenNthCalledWith(1, successfulFile.id, true);
    expect(setFavourite).toHaveBeenNthCalledWith(2, failedFile.id, true);
    expect(service.loadingIds()).toEqual(new Set([successfulFile.id]));
    expect(showToast).toHaveBeenCalledWith(
      'Favourite update failed',
      'Favourite update failed on server',
      MessageSeverity.error,
    );
    expect(userFiles().find((file) => file.id === successfulFile.id)?.isFavourite)
      .toBe(false);

    pendingSuccess.next({});
    pendingSuccess.complete();

    expect(userFiles().find((file) => file.id === successfulFile.id)?.isFavourite)
      .toBe(true);
    expect(userFiles().find((file) => file.id === failedFile.id)?.isFavourite)
      .toBe(false);
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(showToast).toHaveBeenCalledWith(
      'Favourite Update',
      "Added 'successful.txt' to favourites",
      MessageSeverity.success,
    );
  });

  it('records selected files and IDs for a copy action', () => {
    const files = [
      createAppFile(20, 'first.txt'),
      createAppFile(21, 'second.txt'),
    ];
    userFiles.set(files);

    service.markFilesToCopyWithFeedback(files);

    expect(service.awaitingActionState()).toEqual({
      files: new Set(files),
      filesIds: new Set([20, 21]),
      type: ActionType.Copy,
    });
  });

  it('records a move action and clears it through the public API', () => {
    const file = createAppFile(22, 'move.txt');
    userFiles.set([file]);

    service.markFilesToMoveWithFeedback([file]);

    expect(service.awaitingActionState()).toEqual({
      files: new Set([file]),
      filesIds: new Set([file.id]),
      type: ActionType.Move,
    });

    service.clearActionContext();

    expect(service.awaitingActionState()).toBeNull();
  });

  it('refreshes selected file objects when file signals change but IDs remain', () => {
    const selectedFile = createAppFile(23, 'original.txt');
    const refreshedFile = createAppFile(23, 'refreshed.txt');
    userFiles.set([selectedFile]);
    service.markFilesToCopyWithFeedback([selectedFile]);

    userFiles.set([refreshedFile]);

    const action = service.awaitingActionState();
    expect(action?.filesIds).toEqual(new Set([selectedFile.id]));
    expect(Array.from(action?.files ?? [])[0]).toBe(refreshedFile);
  });

  it('pastes copied files into the current destination and tracks loading', () => {
    const sourceFiles = [
      createAppFile(30, 'source-one.txt'),
      createAppFile(31, 'source-two.txt'),
    ];
    const copiedFiles = [
      createAppFile(40, 'copy-one.txt', { size: 25 }),
      createAppFile(41, 'copy-two.txt', { size: 35 }),
    ];
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    userFiles.set(sourceFiles);
    service.markFilesToCopyWithFeedback(sourceFiles);
    parentId.set(50);
    parentName.set('Destination');
    userFiles.set([]);
    copyFilesResult = response.asObservable();

    service.pasteFilesWithFeedback(onSuccess);

    expect(copyFiles).toHaveBeenCalledWith([30, 31], 50);
    expect(service.loadingIds()).toEqual(new Set([30, 31]));
    expect(userFiles()).toEqual([]);
    expect(onSuccess).not.toHaveBeenCalled();

    response.next(copiedFiles);

    expect(userFiles()).toEqual(copiedFiles);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(new Set([40, 41]));
    expect(service.awaitingActionState()).toBeNull();
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(60);
    expect(showToast).toHaveBeenCalledWith(
      'Success',
      "Files copied to 'Destination'.",
      MessageSeverity.success,
    );
    expect(service.loadingIds()).toEqual(new Set([30, 31]));

    response.complete();

    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('preserves a newer pending action when an earlier paste succeeds', () => {
    const firstFile = createAppFile(110, 'first.txt');
    const newerFile = createAppFile(111, 'newer.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    userFiles.set([firstFile, newerFile]);
    copyFilesResult = response.asObservable();

    service.markFilesToCopyWithFeedback([firstFile]);
    service.pasteFilesWithFeedback();
    service.markFilesToMoveWithFeedback([newerFile]);

    response.next([createAppFile(112, 'copy.txt')]);
    response.complete();

    expect(service.awaitingActionState()).toEqual({
      files: new Set([newerFile]),
      filesIds: new Set([newerFile.id]),
      type: ActionType.Move,
    });
  });

  it('preserves a new action after clearing and marking during a pending paste', () => {
    const firstFile = createAppFile(113, 'first.txt');
    const newerFile = createAppFile(114, 'newer.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    userFiles.set([firstFile, newerFile]);
    copyFilesResult = response.asObservable();

    service.markFilesToCopyWithFeedback([firstFile]);
    service.pasteFilesWithFeedback();
    service.clearActionContext();
    service.markFilesToCopyWithFeedback([newerFile]);

    response.next([createAppFile(115, 'copy.txt')]);
    response.complete();

    expect(service.awaitingActionState()).toEqual({
      files: new Set([newerFile]),
      filesIds: new Set([newerFile.id]),
      type: ActionType.Copy,
    });
  });

  it('preserves a newer pending action when an earlier paste fails', () => {
    const firstFile = createAppFile(116, 'first.txt');
    const newerFile = createAppFile(117, 'newer.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    userFiles.set([firstFile, newerFile]);
    copyFilesResult = response.asObservable();

    service.markFilesToCopyWithFeedback([firstFile]);
    service.pasteFilesWithFeedback();
    service.markFilesToMoveWithFeedback([newerFile]);

    response.error(new Error('Copy failed'));

    expect(service.awaitingActionState()).toEqual({
      files: new Set([newerFile]),
      filesIds: new Set([newerFile.id]),
      type: ActionType.Move,
    });
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('pastes moved files into the current destination without updating storage', () => {
    const sourceFile = createAppFile(32, 'to-move.txt');
    const movedFile = createAppFile(32, 'to-move.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    userFiles.set([sourceFile]);
    service.markFilesToMoveWithFeedback([sourceFile]);
    parentId.set(60);
    parentName.set('Move destination');
    userFiles.set([]);
    moveFilesResult = response.asObservable();

    service.pasteFilesWithFeedback(onSuccess);

    expect(moveFiles).toHaveBeenCalledWith([sourceFile.id], 60);
    expect(copyFiles).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set([sourceFile.id]));

    response.next([movedFile]);

    expect(userFiles()).toEqual([movedFile]);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(new Set([movedFile.id]));
    expect(showToast).toHaveBeenCalledWith(
      'Success',
      "File moved to 'Move destination'.",
      MessageSeverity.success,
    );
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();

    response.complete();

    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('copies directly to another folder without changing the current list', () => {
    const sourceFile = createAppFile(33, 'source.txt');
    const copiedFile = createAppFile(43, 'copy.txt', { size: 70 });
    userFiles.set([sourceFile]);
    copyFilesResult = of([copiedFile]);

    service.copyFilesWithFeedback([sourceFile], 80, '');

    expect(copyFiles).toHaveBeenCalledWith([sourceFile.id], 80);
    expect(userFiles()).toEqual([sourceFile]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(70);
    expect(showToast).toHaveBeenCalledWith(
      'Success',
      "File copied to 'Root'.",
      MessageSeverity.success,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('moves directly to another folder by removing source files and reloading', () => {
    const sourceFile = createAppFile(34, 'source.txt');
    const movedFile = createAppFile(44, 'source.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    userFiles.set([sourceFile]);
    moveFilesResult = response.asObservable();

    service.moveFilesWithFeedback([sourceFile], 80, 'Other folder', onSuccess);

    expect(moveFiles).toHaveBeenCalledWith([sourceFile.id], 80);
    expect(service.loadingIds()).toEqual(new Set([sourceFile.id]));

    response.next([movedFile]);

    expect(userFiles()).toEqual([]);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();

    response.complete();

    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it.each(['copy', 'move'] as const)(
    'does not let a direct %s clear an action marked after it started',
    (operationName) => {
      const sourceFile = createAppFile(118, 'source.txt');
      const newerFile = createAppFile(119, 'newer.txt');
      const response = new Subject<AppFile[] | SharedFile[]>();
      userFiles.set([sourceFile, newerFile]);

      if (operationName === 'copy') {
        copyFilesResult = response.asObservable();
        service.copyFilesWithFeedback([sourceFile], 80, 'Destination');
      } else {
        moveFilesResult = response.asObservable();
        service.moveFilesWithFeedback([sourceFile], 80, 'Destination');
      }

      service.markFilesToCopyWithFeedback([newerFile]);
      response.next([createAppFile(120, 'result.txt')]);
      response.complete();

      expect(service.awaitingActionState()).toEqual({
        files: new Set([newerFile]),
        filesIds: new Set([newerFile.id]),
        type: ActionType.Copy,
      });
    },
  );

  it('adds copied files to the shared list without updating user storage', () => {
    const sourceFile = createSharedFile(35, 'shared-source.txt');
    const copiedFile = createSharedFile(45, 'shared-copy.txt', { size: 80 });
    mode.set('GetSharedWithMe');
    parentId.set(90);
    sharedFiles.set([sourceFile]);
    copyFilesResult = of([copiedFile]);

    service.copyFilesWithFeedback([sourceFile], 90, 'Shared destination');

    expect(sharedFiles()).toEqual([sourceFile, copiedFile]);
    expect(userFiles()).toEqual([]);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();
  });

  it('reports copy and move failures and clears their loading state', () => {
    const file = createAppFile(36, 'failed.txt');
    copyFilesResult = throwError(() => new Error('copy error'));

    service.copyFilesWithFeedback([file], 80, 'Destination');

    expect(showToast).toHaveBeenCalledWith(
      'Copy failed',
      'Could not copy file.',
      MessageSeverity.error,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());

    moveFilesResult = throwError(() => new Error('move error'));

    service.moveFilesWithFeedback([file], 80, 'Destination');

    expect(showToast).toHaveBeenCalledWith(
      'Move failed',
      'Could not move file.',
      MessageSeverity.error,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('does not reload or invoke callbacks after a move response becomes stale', () => {
    const sourceFile = createAppFile(37, 'source.txt');
    const currentFolderFile = createAppFile(47, 'current-folder.txt');
    const movedFile = createAppFile(57, 'moved.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    parentId.set(70);
    userFiles.set([sourceFile]);
    moveFilesResult = response.asObservable();

    service.moveFilesWithFeedback([sourceFile], 80, 'Other folder', onSuccess);
    parentId.set(71);
    userFiles.set([currentFolderFile]);

    response.next([movedFile]);
    response.complete();

    expect(userFiles()).toEqual([currentFolderFile]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not remove a moved file from the newly displayed list', () => {
    const sourceFile = createAppFile(39, 'source.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    userFiles.set([sourceFile]);
    parentId.set(70);
    moveFilesResult = response.asObservable();

    service.moveFilesWithFeedback([sourceFile], 80, 'Other folder');
    parentId.set(71);
    userFiles.set([sourceFile]);

    response.next([createAppFile(59, 'moved.txt')]);
    response.complete();

    expect(userFiles()).toEqual([sourceFile]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(showToast).toHaveBeenCalledWith(
      'Success',
      "File moved to 'Other folder'.",
      MessageSeverity.success,
    );
  });

  it('does not add a copied file to the current list after its context changes', () => {
    const sourceFile = createAppFile(38, 'source.txt');
    const currentFolderFile = createAppFile(48, 'current-folder.txt');
    const copiedFile = createAppFile(58, 'copy.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    parentId.set(72);
    userFiles.set([sourceFile]);
    copyFilesResult = response.asObservable();

    service.copyFilesWithFeedback([sourceFile], 72, 'Original folder', onSuccess);
    expect(service.loadingIds()).toEqual(new Set([sourceFile.id]));
    parentId.set(73);
    userFiles.set([currentFolderFile]);

    response.next([copiedFile]);
    response.complete();

    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(userFiles()).toEqual([currentFolderFile]);
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(copiedFile.size);
    expect(showToast).toHaveBeenCalledWith(
      'Success',
      "File copied to 'Original folder'.",
      MessageSeverity.success,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('treats a mode change with the same parent ID as a stale context', () => {
    const sourceFile = createAppFile(40, 'source.txt');
    const currentSharedFile = createSharedFile(50, 'current-shared.txt');
    const copiedFile = createAppFile(60, 'copy.txt');
    const response = new Subject<AppFile[] | SharedFile[]>();
    const onSuccess = vi.fn<(ids: Set<number>) => void>();
    parentId.set(74);
    userFiles.set([sourceFile]);
    copyFilesResult = response.asObservable();

    service.copyFilesWithFeedback([sourceFile], 74, 'Original folder', onSuccess);
    mode.set('GetSharedWithMe');
    sharedFiles.set([currentSharedFile]);

    response.next([copiedFile]);
    response.complete();

    expect(userFiles()).toEqual([sourceFile]);
    expect(sharedFiles()).toEqual([currentSharedFile]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not request confirmation or delete files for empty input', async () => {
    const result = await service.deleteFilesWithFeedback([]);

    expect(result).toBe(false);
    expect(confirmChoice).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('does not delete or update files when confirmation is cancelled', async () => {
    const files = [
      createAppFile(70, 'first.txt'),
      createAppFile(71, 'second.txt'),
    ];
    userFiles.set(files);
    confirmationResult = Promise.resolve(false);

    const result = await service.deleteFilesWithFeedback(files);

    expect(result).toBe(false);
    expect(confirmChoice).toHaveBeenCalledOnce();
    expect(deleteFile).not.toHaveBeenCalled();
    expect(userFiles()).toEqual(files);
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('confirms deletion and resolves true before API requests finish', async () => {
    const first = createAppFile(72, 'first.txt', { size: 15 });
    const second = createAppFile(73, 'second.txt', { size: 25 });
    const firstResponse = new Subject<object>();
    const secondResponse = new Subject<object>();
    userFiles.set([first, second]);
    deleteResult = (fileId) =>
      fileId === first.id
        ? firstResponse.asObservable()
        : secondResponse.asObservable();

    const resultPromise = service.deleteFilesWithFeedback([first, second]);

    expect(confirmChoice).toHaveBeenCalledWith({
      title: 'Confirm File Deletion',
      message:
        'Are you sure you want to delete these files?\n• first.txt\n• second.txt',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showPermanentWarning: true,
    });

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(deleteFile).toHaveBeenNthCalledWith(1, first.id);
    expect(deleteFile).toHaveBeenNthCalledWith(2, second.id);
    expect(userFiles()).toEqual([first, second]);
    expect(service.loadingIds()).toEqual(new Set([first.id, second.id]));

    firstResponse.next({});
    firstResponse.complete();
    expect(userFiles()).toEqual([first, second]);

    secondResponse.next({});
    secondResponse.complete();

    expect(userFiles()).toEqual([]);
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(-first.size);
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(-second.size);
    expect(showToast).toHaveBeenCalledWith(
      'File Deletion',
      'Deleted 2 files successfully',
      MessageSeverity.success,
    );
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('deletes shared files without changing user storage', async () => {
    const sharedFile = createSharedFile(74, 'shared.txt', { size: 50 });
    mode.set('GetSharedWithMe');
    sharedFiles.set([sharedFile]);
    deleteResult = () => of({});

    const result = await service.deleteFilesWithFeedback([sharedFile]);

    expect(result).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(sharedFile.id);
    expect(sharedFiles()).toEqual([]);
    expect(userFiles()).toEqual([]);
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();
    expect(service.loadingIds()).toEqual(new Set<number>());
  });

  it('removes only successful files and reports partial deletion failures', async () => {
    const successfulFile = createAppFile(75, 'successful.txt', { size: 20 });
    const failedFile = createAppFile(76, 'failed.txt', { size: 40 });
    const successResponse = new Subject<object>();
    userFiles.set([successfulFile, failedFile]);
    deleteResult = (fileId) =>
      fileId === successfulFile.id
        ? successResponse.asObservable()
        : throwError(() => new Error('Delete request failed'));

    const resultPromise = service.deleteFilesWithFeedback([
      successfulFile,
      failedFile,
    ]);
    expect(await resultPromise).toBe(true);

    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(service.loadingIds()).toEqual(new Set([successfulFile.id]));
    expect(showToast).toHaveBeenCalledWith(
      'File deletion',
      'Delete request failed',
      MessageSeverity.error,
    );

    successResponse.next({});
    successResponse.complete();

    expect(userFiles()).toEqual([failedFile]);
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledOnce();
    expect(updateCurrentUserUsedSpace).toHaveBeenCalledWith(
      -successfulFile.size,
    );
    expect(showToast).toHaveBeenCalledWith(
      'File Deletion',
      "Deleted 'successful.txt' successfully",
      MessageSeverity.success,
    );
  });

  it('keeps files and storage unchanged when every deletion fails', async () => {
    const files = [
      createAppFile(77, 'first.txt'),
      createAppFile(78, 'second.txt'),
    ];
    userFiles.set(files);
    deleteResult = () => throwError(() => new Error('Delete request failed'));

    const result = await service.deleteFilesWithFeedback(files);

    expect(result).toBe(true);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(userFiles()).toEqual(files);
    expect(service.loadingIds()).toEqual(new Set<number>());
    expect(updateCurrentUserUsedSpace).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledWith(
      'File deletion',
      'Delete request failed',
      MessageSeverity.error,
    );
    expect(showToast).not.toHaveBeenCalledWith(
      'File Deletion',
      expect.any(String),
      MessageSeverity.success,
    );
  });

  it('creates a directory in the current user context and invokes its callback', () => {
    const createdDirectory = createAppFile(60, 'New folder', {
      isDirectory: true,
    });
    const response = new Subject<AppFile | SharedFile>();
    const onSuccess = vi.fn<(id: number) => void>();
    parentId.set(42);
    createDirectoryResult = response.asObservable();

    service.createDirectoryWithFeedback('New folder', onSuccess);

    expect(createDirectory).toHaveBeenCalledWith('New folder', 42);
    expect(userFiles()).toEqual([]);
    expect(reloadCurrentList).not.toHaveBeenCalled();

    response.next(createdDirectory);

    expect(userFiles()).toEqual([createdDirectory]);
    expect(onSuccess).toHaveBeenCalledWith(createdDirectory.id);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      'New directory created',
      'Directory "New folder" has been created',
      MessageSeverity.success,
    );
    response.complete();
  });

  it('adds a created directory to the shared list in the shared context', () => {
    const createdDirectory = createSharedFile(61, 'Shared folder', {
      isDirectory: true,
    });
    mode.set('GetSharedWithMe');
    parentId.set(43);
    createDirectoryResult = of(createdDirectory);

    service.createDirectoryWithFeedback('Shared folder');

    expect(createDirectory).toHaveBeenCalledWith('Shared folder', 43);
    expect(sharedFiles()).toEqual([createdDirectory]);
    expect(userFiles()).toEqual([]);
    expect(reloadCurrentList).toHaveBeenCalledTimes(1);
  });

  it('reports directory creation errors without updating the file lists', () => {
    const onSuccess = vi.fn<(id: number) => void>();
    createDirectoryResult = throwError(() => ({
      error: 'Creation was rejected',
    }));

    service.createDirectoryWithFeedback('Rejected folder', onSuccess);

    expect(createDirectory).toHaveBeenCalledWith('Rejected folder', null);
    expect(userFiles()).toEqual([]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Error creating directory',
      'Creation was rejected',
      MessageSeverity.error,
    );
  });

  it('suppresses directory updates and callbacks when the context changes', () => {
    const currentFolderFile = createAppFile(49, 'current-folder.txt');
    const createdDirectory = createAppFile(62, 'New folder', {
      isDirectory: true,
    });
    const response = new Subject<AppFile | SharedFile>();
    const onSuccess = vi.fn<(id: number) => void>();
    parentId.set(44);
    createDirectoryResult = response.asObservable();

    service.createDirectoryWithFeedback('New folder', onSuccess);
    parentId.set(45);
    userFiles.set([currentFolderFile]);

    response.next(createdDirectory);
    response.complete();

    expect(userFiles()).toEqual([currentFolderFile]);
    expect(reloadCurrentList).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
