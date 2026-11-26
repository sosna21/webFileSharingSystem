import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Event as RouterEvent,
  NavigationEnd,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppFile } from '../models/app-file.model';
import { BaseFile, FileStatus } from '../models/base-file.model';
import { Breadcrumb } from '../models/breadcrumb.model';
import { FileResponse } from '../models/file-response.model';
import { ShareAccessMode } from '../models/share-access-mode.model';
import { SharedFile } from '../models/shared-file.model';
import { User } from '../models/user.model';
import { AuthenticationService } from './authentication.service';
import { FileApiService } from './api/file-api.service';
import { FileViewService } from './file-view.service';

const fileUrl = `${environment.apiUrl}/File`;

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
    size: 12,
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

function createResponse<T extends BaseFile>(
  items: T[],
  overrides: Partial<FileResponse<T>> = {},
): FileResponse<T> {
  return {
    items,
    pageIndex: 1,
    totalPages: 1,
    totalCount: items.length,
    ...overrides,
  };
}

describe('FileViewService', () => {
  let service: FileViewService;
  let httpTesting: HttpTestingController;
  let routerUrl: string;
  let routerEvents: Subject<RouterEvent>;
  let routerNavigate: ReturnType<typeof vi.fn<Router['navigate']>>;
  let navigationId: number;

  function setup(initialUrl: string) {
    routerUrl = initialUrl;
    routerEvents = new Subject<RouterEvent>();
    routerNavigate = vi.fn<Router['navigate']>();
    navigationId = 0;

    const router = {
      get url() {
        return routerUrl;
      },
      events: routerEvents,
      navigate: routerNavigate,
    } satisfies Pick<Router, 'url' | 'events' | 'navigate'>;
    const currentUser = signal<User | null>(null).asReadonly();

    TestBed.configureTestingModule({
      providers: [
        FileViewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: AuthenticationService,
          useValue: {
            currentUser,
          } satisfies Pick<AuthenticationService, 'currentUser'>,
        },
        {
          provide: FileApiService,
          useValue: {
            getActiveUploads: () => of([]),
          } satisfies Pick<FileApiService, 'getActiveUploads'>,
        },
      ],
    });

    service = TestBed.inject(FileViewService);
    httpTesting = TestBed.inject(HttpTestingController);
  }

  function flushBreadcrumbs(parentId: number) {
    httpTesting.expectOne(`${fileUrl}/GetFilePath/${parentId}`).flush([]);
  }

  function navigateTo(url: string) {
    routerUrl = url;
    routerEvents.next(new NavigationEnd(++navigationId, url, url));
    TestBed.tick();
  }

  function startNavigationTo(url: string) {
    routerUrl = url;
    routerEvents.next(new NavigationStart(++navigationId, url));
    TestBed.tick();
  }

  async function flushNavigationRequests(breadcrumbs: Breadcrumb[] = []) {
    TestBed.tick();
    const fileRequests = httpTesting.match(
      (req) => req.url.startsWith(`${fileUrl}/Get`) && req.url.includes('?'),
    );
    fileRequests.forEach((request) =>
      request.flush(createResponse<AppFile>([])),
    );

    const breadcrumbRequests = httpTesting.match((req) =>
      req.url.startsWith(`${fileUrl}/GetFilePath/`),
    );
    breadcrumbRequests.forEach((request) => request.flush(breadcrumbs));
    await stabilize();
  }

  async function loadUserFiles(
    files: AppFile[],
    response: Partial<FileResponse<AppFile>> = {},
  ) {
    TestBed.tick();
    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse(files, response));
    await stabilize();
  }

  async function stabilize() {
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
  }

  afterEach(() => {
    httpTesting?.verify();
  });

  it.each([
    ['/disc/home', 'GetAll'],
    ['/disc/shared-by-me', 'GetSharedByMe'],
    ['/disc/favourite', 'GetFavourites'],
    ['/disc/recent', 'GetRecent'],
    ['/disc/shared-with-me', 'GetSharedWithMe'],
  ] as const)('maps URL %s to mode %s', async (url, mode) => {
    setup('/disc/home');
    await flushNavigationRequests();

    navigateTo(url);

    expect(service.mode()).toBe(mode);
    await flushNavigationRequests();
  });

  it('updates view mode and search state only after NavigationEnd', async () => {
    setup('/disc/home?search=first');
    await flushNavigationRequests();

    startNavigationTo('/disc/shared-with-me?search=second');
    expect(service.mode()).toBe('GetAll');
    expect(service.searchedPhrase()).toBe('first');
    httpTesting.expectNone((req) => req.url.startsWith(`${fileUrl}/Get`));

    navigateTo('/disc/shared-with-me?search=second');

    expect(service.mode()).toBe('GetSharedWithMe');
    expect(service.searchedPhrase()).toBe('second');
    await flushNavigationRequests();
  });

  it('updates the parent ID when moving between folders and returning to root', async () => {
    setup('/disc/home');
    await flushNavigationRequests();
    expect(service.parentId()).toBeNull();

    navigateTo('/disc/home/folder/12');
    expect(service.parentId()).toBe(12);
    await flushNavigationRequests([
      { id: 12, fileName: 'First folder', level: 1 },
    ]);

    navigateTo('/disc/home/folder/27');
    expect(service.parentId()).toBe(27);
    await flushNavigationRequests([
      { id: 27, fileName: 'Second folder', level: 1 },
    ]);

    navigateTo('/disc/home');
    expect(service.parentId()).toBeNull();
    await flushNavigationRequests();

    navigateTo('/disc/home/folder/not-a-number');
    expect(service.parentId()).toBeNull();
    await flushNavigationRequests();
  });

  it('builds the home breadcrumb at the root', async () => {
    setup('/disc/home');
    await flushNavigationRequests();

    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
    ]);
    expect(service.parentName()).toBe('Home');
  });

  it('adds a search-result breadcrumb for a non-empty search phrase', async () => {
    setup('/disc/home?search=%20quarterly%20');
    await flushNavigationRequests();

    expect(service.searchedPhrase()).toBe(' quarterly ');
    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
      'Search result',
    ]);
  });

  it('builds nested breadcrumbs and updates parent information after navigation', async () => {
    setup('/disc/home/folder/23');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse<AppFile>([]));
    httpTesting.expectOne(`${fileUrl}/GetFilePath/23`).flush([
      {
        id: 10,
        fileName: 'Parent folder',
        level: 1,
        accessMode: ShareAccessMode.ReadWrite,
      },
      {
        id: 23,
        fileName: 'Current folder',
        level: 2,
        accessMode: ShareAccessMode.ReadOnly,
      },
    ]);
    await stabilize();

    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
      'Parent folder',
      'Current folder',
    ]);
    expect(service.parentId()).toBe(23);
    expect(service.parentName()).toBe('Current folder');
    expect(service.parentBreadcrumb()).toMatchObject({
      id: 23,
      fileName: 'Current folder',
      accessMode: ShareAccessMode.ReadOnly,
    });
    expect(service.isParentMinWriteAccess()).toBe(false);

    navigateTo('/disc/home/folder/24');
    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse<AppFile>([]));
    httpTesting.expectOne(`${fileUrl}/GetFilePath/24`).flush([
      {
        id: 24,
        fileName: 'Next folder',
        level: 1,
        accessMode: ShareAccessMode.FullAccess,
      },
    ]);
    await stabilize();

    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
      'Next folder',
    ]);
    expect(service.parentName()).toBe('Next folder');
    expect(service.isParentMinWriteAccess()).toBe(true);
  });

  it('uses the home breadcrumb when a nested breadcrumb response is empty', async () => {
    setup('/disc/home/folder/99');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse<AppFile>([]));
    httpTesting.expectOne(`${fileUrl}/GetFilePath/99`).flush([]);
    await stabilize();

    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
    ]);
    expect(service.parentName()).toBe('Home');
  });

  it('allows minimum write access when the active parent is read-write', async () => {
    setup('/disc/home/folder/31');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse<AppFile>([]));
    httpTesting.expectOne(`${fileUrl}/GetFilePath/31`).flush([
      {
        id: 31,
        fileName: 'Writable folder',
        level: 1,
        accessMode: ShareAccessMode.ReadWrite,
      },
    ]);
    await stabilize();

    expect(service.parentBreadcrumb()).toMatchObject({
      id: 31,
      accessMode: ShareAccessMode.ReadWrite,
    });
    expect(service.isParentMinWriteAccess()).toBe(true);
  });

  it('exposes breadcrumb API errors and falls back to the home breadcrumb', async () => {
    setup('/disc/home/folder/51');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse<AppFile>([]));
    httpTesting.expectOne(`${fileUrl}/GetFilePath/51`).flush('Failed', {
      status: 500,
      statusText: 'Server Error',
    });
    await stabilize();

    expect(service.breadCrumbsResource.status()).toBe('error');
    expect(service.breadCrumbsResource.error()).toBeInstanceOf(
      HttpErrorResponse,
    );
    expect(service.breadCrumbs().map((crumb) => crumb.fileName)).toEqual([
      'Home',
    ]);
    expect(service.parentName()).toBe('Home');
  });

  it('navigates to folders and roots using the active view route', async () => {
    setup('/disc/shared-by-me');
    await flushNavigationRequests();

    service.goToFolder(8);
    expect(routerNavigate).toHaveBeenLastCalledWith([
      '/disc',
      'home',
      'folder',
      8,
    ]);
    service.goToFolder(null);
    expect(routerNavigate).toHaveBeenLastCalledWith(['/disc', 'shared-by-me']);

    navigateTo('/disc/shared-with-me');
    await flushNavigationRequests();
    service.goToFolder(14);
    expect(routerNavigate).toHaveBeenLastCalledWith([
      '/disc',
      'shared-with-me',
      'folder',
      14,
    ]);
  });

  it('uses filename ascending as the default ordering without an active sort option', async () => {
    setup('/disc/home');
    const files = [
      createAppFile(1, 'zeta.txt'),
      createAppFile(2, 'alpha.txt'),
      createAppFile(3, 'mu.txt'),
    ];

    await loadUserFiles(files);

    expect(service.sortOption()).toBeNull();
    expect(
      service.fileResource.value()?.items.map((file) => file.fileName),
    ).toEqual(['zeta.txt', 'alpha.txt', 'mu.txt']);
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'alpha.txt',
      'mu.txt',
      'zeta.txt',
    ]);
  });

  it('sorts by a selected column, toggles direction, and resets direction on a new column', async () => {
    setup('/disc/home');
    await loadUserFiles([
      createAppFile(1, 'zeta.txt', { size: 30 }),
      createAppFile(2, 'alpha.txt', { size: 10 }),
      createAppFile(3, 'mu.txt', { size: 20 }),
    ]);

    service.toggleSort('size');
    expect(service.sortOption()).toEqual({ column: 'size', direction: 'asc' });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'alpha.txt',
      'mu.txt',
      'zeta.txt',
    ]);

    service.toggleSort('size');
    expect(service.sortOption()).toEqual({ column: 'size', direction: 'desc' });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'zeta.txt',
      'mu.txt',
      'alpha.txt',
    ]);

    service.toggleSort('fileName');
    expect(service.sortOption()).toEqual({
      column: 'fileName',
      direction: 'asc',
    });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'alpha.txt',
      'mu.txt',
      'zeta.txt',
    ]);
  });

  it('supports descending-first sorting and toggles back through ascending to no sort', async () => {
    setup('/disc/home');
    await loadUserFiles([
      createAppFile(1, 'small.txt', { size: 1 }),
      createAppFile(2, 'large.txt', { size: 9 }),
      createAppFile(3, 'medium.txt', { size: 5 }),
    ]);

    service.toggleSort('size', true);
    expect(service.sortOption()).toEqual({ column: 'size', direction: 'desc' });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'large.txt',
      'medium.txt',
      'small.txt',
    ]);

    service.toggleSort('size', true);
    expect(service.sortOption()).toEqual({ column: 'size', direction: 'asc' });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'small.txt',
      'medium.txt',
      'large.txt',
    ]);

    service.toggleSort('size', true);
    expect(service.sortOption()).toBeNull();
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'large.txt',
      'medium.txt',
      'small.txt',
    ]);
  });

  it('sorts user files by user-only columns and ignores shared-only columns', async () => {
    setup('/disc/home');
    await loadUserFiles([
      createAppFile(1, 'charlie.txt', { isFavourite: true }),
      createAppFile(2, 'beta.txt', { isFavourite: false }),
      createAppFile(3, 'alpha.txt', { isFavourite: true }),
    ]);

    service.toggleSort('favourite');
    expect(service.sortOption()).toEqual({
      column: 'favourite',
      direction: 'asc',
    });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'beta.txt',
      'alpha.txt',
      'charlie.txt',
    ]);

    service.toggleSort('accessMode');
    expect(service.sortOption()).toEqual({
      column: 'favourite',
      direction: 'asc',
    });
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'beta.txt',
      'alpha.txt',
      'charlie.txt',
    ]);
  });

  it('sorts shared files by shared-only columns and ignores user-only columns', async () => {
    setup('/disc/shared-with-me');
    TestBed.tick();
    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetSharedWithMe?`))
      .flush(
        createResponse([
          createSharedFile(1, 'write.txt', {
            accessMode: ShareAccessMode.ReadWrite,
          }),
          createSharedFile(2, 'read.txt', {
            accessMode: ShareAccessMode.ReadOnly,
          }),
          createSharedFile(3, 'full.txt', {
            accessMode: ShareAccessMode.FullAccess,
          }),
        ]),
      );
    await stabilize();

    service.toggleSort('accessMode');
    expect(service.sortOption()).toEqual({
      column: 'accessMode',
      direction: 'asc',
    });
    expect(service.sharedFiles().map((file) => file.fileName)).toEqual([
      'read.txt',
      'write.txt',
      'full.txt',
    ]);

    service.toggleSort('favourite');
    expect(service.sortOption()).toEqual({
      column: 'accessMode',
      direction: 'asc',
    });
    expect(service.sharedFiles().map((file) => file.fileName)).toEqual([
      'read.txt',
      'write.txt',
      'full.txt',
    ]);
  });

  it('keeps sorting applied to a new resource response without sorting the resource data', async () => {
    setup('/disc/home');
    await loadUserFiles([
      createAppFile(1, 'initial-large.txt', { size: 30 }),
      createAppFile(2, 'initial-small.txt', { size: 10 }),
    ]);
    service.toggleSort('size');

    service.reloadCurrentList();
    TestBed.tick();
    const reloadRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    reloadRequest.flush(
      createResponse([
        createAppFile(3, 'new-large.txt', { size: 30 }),
        createAppFile(4, 'new-small.txt', { size: 10 }),
        createAppFile(5, 'new-medium.txt', { size: 20 }),
      ]),
    );
    await stabilize();

    expect(service.sortOption()).toEqual({ column: 'size', direction: 'asc' });
    expect(
      service.fileResource.value()?.items.map((file) => file.fileName),
    ).toEqual(['new-large.txt', 'new-small.txt', 'new-medium.txt']);
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'new-small.txt',
      'new-medium.txt',
      'new-large.txt',
    ]);
  });

  it('requests changed page and page size and reflects the returned user totals', async () => {
    setup('/disc/home');
    await loadUserFiles([], {
      pageIndex: 1,
      totalPages: 12,
      totalCount: 111,
    });
    expect(service.pagainationData()).toEqual({
      currentPage: 1,
      itemsPerPage: 9999,
      totalItems: 111,
      totalPages: 12,
    });

    service.currentPage.set(4);
    TestBed.tick();
    const pageRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    let query = new URL(pageRequest.request.urlWithParams, 'http://localhost')
      .searchParams;
    expect(query.get('PageNumber')).toBe('4');
    expect(query.get('PageSize')).toBe('9999');
    pageRequest.flush(
      createResponse([], {
        pageIndex: 4,
        totalPages: 12,
        totalCount: 111,
      }),
    );
    await stabilize();

    service.itemsPerPage.set(25);
    TestBed.tick();
    const pageSizeRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    query = new URL(pageSizeRequest.request.urlWithParams, 'http://localhost')
      .searchParams;
    expect(query.get('PageNumber')).toBe('4');
    expect(query.get('PageSize')).toBe('25');
    pageSizeRequest.flush(
      createResponse([], {
        pageIndex: 4,
        totalPages: 5,
        totalCount: 111,
      }),
    );
    await stabilize();

    expect(service.pagainationData()).toEqual({
      currentPage: 4,
      itemsPerPage: 25,
      totalItems: 111,
      totalPages: 5,
    });
  });

  it('loads user files with the current page, parent, and search parameters', async () => {
    setup('/disc/home/folder/42?search=invoice');
    service.currentPage.set(3);
    service.itemsPerPage.set(25);
    TestBed.tick();

    const request = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    const query = new URL(request.request.urlWithParams, 'http://localhost')
      .searchParams;

    expect(query.get('PageNumber')).toBe('3');
    expect(query.get('PageSize')).toBe('25');
    expect(query.get('ParentId')).toBe('42');
    expect(query.get('SearchedPhrase')).toBe('invoice');
    expect(service.fileResource.isLoading()).toBe(true);

    flushBreadcrumbs(42);
    request.flush(
      createResponse([createAppFile(1, 'invoice.pdf')], {
        pageIndex: 3,
        totalPages: 8,
        totalCount: 187,
      }),
    );
    await stabilize();

    expect(service.fileResource.status()).toBe('resolved');
    expect(service.fileResource.isLoading()).toBe(false);
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'invoice.pdf',
    ]);
    expect(service.pagainationData()).toEqual({
      currentPage: 3,
      itemsPerPage: 25,
      totalItems: 187,
      totalPages: 8,
    });
  });

  it('loads shared files and exposes the shared resource response totals', async () => {
    setup('/disc/shared-with-me/folder/17?search=report');
    service.currentPage.set(2);
    service.itemsPerPage.set(10);
    TestBed.tick();

    const request = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetSharedWithMe?`),
    );
    const query = new URL(request.request.urlWithParams, 'http://localhost')
      .searchParams;

    expect(query.get('PageNumber')).toBe('2');
    expect(query.get('PageSize')).toBe('10');
    expect(query.get('ParentId')).toBe('17');
    expect(query.get('SearchedPhrase')).toBe('report');
    expect(service.sharedFilesResource.isLoading()).toBe(true);

    flushBreadcrumbs(17);
    request.flush(
      createResponse([createSharedFile(2, 'report.pdf')], {
        pageIndex: 2,
        totalPages: 4,
        totalCount: 35,
      }),
    );
    await stabilize();

    expect(service.sharedFilesResource.status()).toBe('resolved');
    expect(service.sharedFiles().map((file) => file.fileName)).toEqual([
      'report.pdf',
    ]);
    expect(service.sharedFilesResource.value()).toMatchObject({
      pageIndex: 2,
      totalPages: 4,
      totalCount: 35,
    });
  });

  it('exposes an empty user result and its zero pagination totals', async () => {
    setup('/disc/home');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse([], { totalPages: 0, totalCount: 0 }));
    await stabilize();

    expect(service.fileResource.status()).toBe('resolved');
    expect(service.userFiles()).toEqual([]);
    expect(service.pagainationData()).toEqual({
      currentPage: 1,
      itemsPerPage: 9999,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('reports reload errors and clears loading after the failed reload', async () => {
    setup('/disc/home/folder/42');
    TestBed.tick();

    const initialRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    flushBreadcrumbs(42);
    initialRequest.flush(
      createResponse([createAppFile(1, 'existing.txt')], {
        totalPages: 2,
        totalCount: 11,
      }),
    );
    await stabilize();

    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'existing.txt',
    ]);

    service.reloadCurrentList();
    TestBed.tick();
    const reloadRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    expect(service.fileResource.isLoading()).toBe(true);

    reloadRequest.flush('Request failed', {
      status: 500,
      statusText: 'Server Error',
    });
    await stabilize();

    expect(service.fileResource.status()).toBe('error');
    expect(service.fileResource.error()).toBeInstanceOf(HttpErrorResponse);
    expect(service.fileResource.isLoading()).toBe(false);
    expect(() => service.userFiles()).toThrow();
    expect(() => service.pagainationData()).toThrow();
  });

  it('reloads and resolves the active user resource again', async () => {
    setup('/disc/home');
    TestBed.tick();

    httpTesting
      .expectOne((req) => req.url.startsWith(`${fileUrl}/GetAll?`))
      .flush(createResponse([createAppFile(1, 'before.txt')]));
    await stabilize();

    service.reloadCurrentList();
    TestBed.tick();
    const reloadRequest = httpTesting.expectOne((req) =>
      req.url.startsWith(`${fileUrl}/GetAll?`),
    );
    reloadRequest.flush(createResponse([createAppFile(2, 'after.txt')]));
    await stabilize();

    expect(service.fileResource.status()).toBe('resolved');
    expect(service.userFiles().map((file) => file.fileName)).toEqual([
      'after.txt',
    ]);
  });
});
