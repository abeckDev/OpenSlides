import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import { PblColumnDefinition } from '@pebula/ngrid';

import { StorageService } from 'app/core/core-services/storage.service';
import { CategoryRepositoryService } from 'app/core/repositories/motions/category-repository.service';
import { MotionBlockRepositoryService } from 'app/core/repositories/motions/motion-block-repository.service';
import { MotionRepositoryService } from 'app/core/repositories/motions/motion-repository.service';
import { WorkflowRepositoryService } from 'app/core/repositories/motions/workflow-repository.service';
import { TagRepositoryService } from 'app/core/repositories/tags/tag-repository.service';
import { OsFilterOptionCondition } from 'app/core/ui-services/base-filter-list.service';
import { ConfigService } from 'app/core/ui-services/config.service';
import { SpinnerService } from 'app/core/ui-services/spinner.service';
import { ColumnRestriction } from 'app/shared/components/list-view-table/list-view-table.component';
import { infoDialogSettings, largeDialogSettings } from 'app/shared/utils/dialog-settings';
import { BaseListViewComponent } from 'app/site/base/base-list-view';
import { ViewCategory } from 'app/site/motions/models/view-category';
import { ViewMotion } from 'app/site/motions/models/view-motion';
import { ViewMotionBlock } from 'app/site/motions/models/view-motion-block';
import { ViewWorkflow } from 'app/site/motions/models/view-workflow';
import { LocalPermissionsService } from 'app/site/motions/services/local-permissions.service';
import { MotionExportInfo, MotionExportService } from 'app/site/motions/services/motion-export.service';
import { MotionFilterListService } from 'app/site/motions/services/motion-filter-list.service';
import { MotionMultiselectService } from 'app/site/motions/services/motion-multiselect.service';
import { MotionSortListService } from 'app/site/motions/services/motion-sort-list.service';
import { ViewTag } from 'app/site/tags/models/view-tag';
import { MotionExportDialogComponent } from '../../../shared-motion/motion-export-dialog/motion-export-dialog.component';

interface TileCategoryInformation {
    filter: string;
    name: string;
    prefix?: string;
    condition: OsFilterOptionCondition;
    amountOfMotions: number;
}

/**
 * Interface to describe possible values and changes for
 * meta information dialog.
 */
interface InfoDialog {
    /**
     * The title of the motion
     */
    title: string;

    /**
     * The motion block id
     */
    motionBlock: number;

    /**
     * The category id
     */
    category: number;

    /**
     * The motions tag ids
     */
    tags: number[];
}

/**
 * Component that displays all the motions in a Table using DataSource.
 */
@Component({
    selector: 'os-motion-list',
    templateUrl: './motion-list.component.html',
    styleUrls: ['./motion-list.component.scss']
})
export class MotionListComponent extends BaseListViewComponent<ViewMotion> implements OnInit {
    /**
     * Reference to the dialog for quick editing meta information.
     */
    @ViewChild('motionInfoDialog', { static: true })
    private motionInfoDialog: TemplateRef<string>;

    /**
     * Interface to hold meta information.
     */
    public infoDialog: InfoDialog;

    /**
     * String to define the current selected view.
     */
    public selectedView: string;

    /**
     * Columns to display in table when desktop view is available
     * Define the columns to show
     */
    public tableColumnDefinition: PblColumnDefinition[] = [
        {
            prop: 'identifier'
        },
        {
            prop: 'title',
            width: 'auto'
        },
        {
            prop: 'state',
            width: '20%',
            minWidth: 160
        },
        {
            prop: 'speaker',
            width: this.badgeButtonWidth
        }
    ];

    /**
     * Value of the configuration variable `motions_statutes_enabled` - are statutes enabled?
     * @TODO replace by direct access to config variable, once it's available from the templates
     */
    public statutesEnabled: boolean;

    /**
     * Value of the config variable `motions_show_sequential_numbers`
     */
    public showSequential: boolean;

    public recommendationEnabled: boolean;

    public tags: ViewTag[] = [];
    public workflows: ViewWorkflow[] = [];
    public categories: ViewCategory[] = [];
    public motionBlocks: ViewMotionBlock[] = [];

    /**
     * Columns that demand certain permissions
     */
    public restrictedColumns: ColumnRestriction[] = [
        {
            columnName: 'speaker',
            permission: 'agenda.can_see_list_of_speakers'
        }
    ];

    /**
     * Define extra filter properties
     *
     * TODO: repo.getExtendedStateLabel(), repo.getExtendedRecommendationLabel()
     */
    public filterProps = ['submitters', 'motion_block', 'title', 'identifier'];

    /**
     * List of `TileCategoryInformation`.
     * Necessary to not iterate over the values of the map below.
     */
    public listTiles: TileCategoryInformation[];

    private motionTiles: TileCategoryInformation[] = [];

    private categoryTiles: TileCategoryInformation[] = [];

    /**
     * The verbose name for the motions.
     */
    public motionsVerboseName: string;

    /**
     * Constructor implements title and translation Module.
     *
     * @param titleService Title
     * @param translate Translation
     * @param matSnackBar showing errors
     * @param sortService sorting
     * @param filterService filtering
     * @param router Router
     * @param route Current route
     * @param configService The configuration provider
     * @param repo Motion Repository
     * @param tagRepo Tag Repository
     * @param motionBlockRepo
     * @param categoryRepo
     * @param categoryRepo: Repo for categories. Used to define filters
     * @param workflowRepo: Repo for Workflows. Used to define filters
     * @param motionCsvExport
     * @param pdfExport To export motions as PDF
     * @param multiselectService Service for the multiSelect actions
     * @param userRepo
     * @param vp
     * @param perms LocalPermissionService
     */
    public constructor(
        titleService: Title,
        protected translate: TranslateService, // protected required for ng-translate-extract
        matSnackBar: MatSnackBar,
        private route: ActivatedRoute,
        storage: StorageService,
        public filterService: MotionFilterListService,
        public sortService: MotionSortListService,
        private router: Router,
        private configService: ConfigService,
        private tagRepo: TagRepositoryService,
        private motionBlockRepo: MotionBlockRepositoryService,
        private categoryRepo: CategoryRepositoryService,
        private workflowRepo: WorkflowRepositoryService,
        public motionRepo: MotionRepositoryService,
        private dialog: MatDialog,
        public multiselectService: MotionMultiselectService,
        public perms: LocalPermissionsService,
        private motionExport: MotionExportService,
        private spinnerService: SpinnerService
    ) {
        super(titleService, translate, matSnackBar, storage);
        this.canMultiSelect = true;
    }

    /**
     * Init function.
     *
     * Sets the title, inits the table, defines the filter/sorting options and
     * subscribes to filter and sorting services
     */
    public async ngOnInit(): Promise<void> {
        super.setTitle('Motions');

        this.configService
            .get<boolean>('motions_statutes_enabled')
            .subscribe(enabled => (this.statutesEnabled = enabled));
        this.configService.get<string>('motions_recommendations_by').subscribe(recommender => {
            this.recommendationEnabled = !!recommender;
        });
        this.configService
            .get<boolean>('motions_show_sequential_numbers')
            .subscribe(show => (this.showSequential = show));
        this.motionBlockRepo.getViewModelListObservable().subscribe(mBs => {
            this.motionBlocks = mBs;
        });
        this.categoryRepo.getViewModelListObservable().subscribe(cats => {
            this.categories = cats;
            if (cats.length > 0) {
                this.storage.get<string>('motionListView').then(savedView => {
                    this.selectedView = savedView ? savedView : 'tiles';
                });
            } else {
                this.selectedView = 'list';
            }
        });
        this.tagRepo.getViewModelListObservable().subscribe(tags => {
            this.tags = tags;
        });
        this.workflowRepo.getViewModelListObservable().subscribe(wfs => (this.workflows = wfs));

        this.motionRepo.getViewModelListObservable().subscribe(motions => {
            if (motions && motions.length) {
                this.createMotionTiles(motions);
            }
        });
    }

    /**
     * Publishes the tileList
     */
    private createTileList(): void {
        this.listTiles = this.categoryTiles.concat(this.motionTiles);
    }

    /**
     * Creates the tiles for categories.
     * Filters thous without parent, sorts them by theit weight, maps them to TileInfo and publishes
     * the result
     */
    private createCategoryTiles(categories: ViewCategory[]): void {
        this.categoryTiles = categories
            .filter(category => !category.parent_id && !!category.totalAmountOfMotions)
            .sort((a, b) => a.weight - b.weight)
            .map(category => {
                return {
                    filter: 'category',
                    name: category.name,
                    condition: category.id,
                    amountOfMotions: category.totalAmountOfMotions,
                    prefix: category.prefix
                };
            });
    }

    /**
     * Creates the tiles for motions
     * @param motions
     */
    private createMotionTiles(motions: ViewMotion[]): void {
        this.motionTiles = [];
        let favoriteMotions = 0;
        let motionsWithNotes = 0;
        let motionsWithoutCategory = 0;
        const localCategories = new Set<ViewCategory>();

        for (const motion of motions) {
            if (!motion.category_id) {
                motionsWithoutCategory++;
            } else {
                localCategories.add(motion.category.oldestParent);
            }
            favoriteMotions += +this.motionHasProp(motion, 'star');
            motionsWithNotes += +this.motionHasProp(motion, 'hasNotes');
        }

        this.addToTileInfo('Favorites', 'star', true, favoriteMotions);
        this.addToTileInfo('Personal notes', 'hasNotes', true, motionsWithNotes);
        this.addToTileInfo('No category', 'category', null, motionsWithoutCategory);

        this.createCategoryTiles(Array.from(localCategories));

        this.createTileList();
    }

    /**
     * @returns true if the motion has the given prop
     */
    private motionHasProp(motion: ViewMotion, property: string, positive: boolean = true): boolean {
        return !!motion[property] === positive ? true : false;
    }

    /**
     * Helper function to add new tile information to the tileCategories-List
     */
    private addToTileInfo(name: string, filter: string, condition: OsFilterOptionCondition, amount: number): void {
        if (amount) {
            this.motionTiles.push({
                filter: filter,
                name: name,
                condition: condition,
                amountOfMotions: amount
            });
        }
    }

    /**
     * Handler for the plus button
     */
    public onPlusButton(): void {
        this.router.navigate(['./new'], { relativeTo: this.route });
    }

    /**
     * Opens the export dialog.
     * The export will be limited to the selected data if multiselect modus is
     * active and there are rows selected
     */
    public openExportDialog(): void {
        const exportDialogRef = this.dialog.open(MotionExportDialogComponent, {
            ...largeDialogSettings,
            data: this.dataSource
        });

        exportDialogRef
            .afterClosed()
            .subscribe((exportInfo: MotionExportInfo) =>
                this.motionExport.evaluateExportRequest(
                    exportInfo,
                    this.isMultiSelect ? this.selectedRows : this.dataSource.filteredData
                )
            );
    }

    /**
     * Wraps multiselect actions to close the multiselect mode or throw an error if one happens.
     *
     * @param multiselectPromise The promise returned by multiselect actions.
     */
    public async multiselectWrapper(multiselectPromise: Promise<void>): Promise<void> {
        try {
            await multiselectPromise;
        } catch (e) {
            this.raiseError(e);
        } finally {
            this.spinnerService.setVisibility(false);
        }
    }

    /**
     * This function saves the selected view by changes.
     *
     * @param value is the new view the user has selected.
     */
    public onChangeView(value: string): void {
        this.selectedView = value;
        this.storage.set('motionListView', value);
    }

    /**
     * This function changes the view to the list of motions where the selected category becomes the active filter.
     *
     * @param tileCategory information about filter and condition.
     */
    public changeToViewWithTileCategory(tileCategory: TileCategoryInformation): void {
        this.onChangeView('list');
        this.filterService.clearAllFilters();
        this.filterService.toggleFilterOption(tileCategory.filter, {
            label: tileCategory.name,
            condition: tileCategory.condition,
            isActive: false
        });
    }

    /**
     * Opens a dialog to edit some meta information about a motion.
     *
     * @param motion the ViewMotion whose content is edited.
     * @param ev a MouseEvent.
     */
    public async openEditInfo(motion: ViewMotion): Promise<void> {
        if (!this.isMultiSelect && this.perms.isAllowed('change_metadata')) {
            // The interface holding the current information from motion.
            this.infoDialog = {
                title: motion.title,
                motionBlock: motion.motion_block_id,
                category: motion.category_id,
                tags: motion.tags_id
            };

            // Copies the interface to check, if changes were made.
            const copyDialog = { ...this.infoDialog };

            const dialogRef = this.dialog.open(this.motionInfoDialog, infoDialogSettings);

            dialogRef.keydownEvents().subscribe((event: KeyboardEvent) => {
                if (event.key === 'Enter' && event.shiftKey) {
                    dialogRef.close(this.infoDialog);
                }
            });

            // After closing the dialog: Goes through the fields and check if they are changed
            // TODO: Logic like this should be handled in a service
            dialogRef.afterClosed().subscribe(async (result: InfoDialog) => {
                if (result) {
                    const partialUpdate = {
                        category_id: result.category !== copyDialog.category ? result.category : undefined,
                        motion_block_id: result.motionBlock !== copyDialog.motionBlock ? result.motionBlock : undefined,
                        tags_id:
                            JSON.stringify(result.tags) !== JSON.stringify(copyDialog.tags) ? result.tags : undefined
                    };
                    // TODO: "only update if different" was another repo-todo
                    if (!Object.keys(partialUpdate).every(key => partialUpdate[key] === undefined)) {
                        await this.motionRepo.update(partialUpdate, motion).then(null, this.raiseError);
                    }
                }
            });
        }
    }

    /**
     * @returns if there are amendments or not
     */
    public hasAmendments(): boolean {
        return !!this.motionRepo.getAllAmendmentsInstantly().length;
    }

    /**
     * Checks if categories are available.
     *
     * @returns A boolean if they are available.
     */
    public isCategoryAvailable(): boolean {
        return !!this.categories && this.categories.length > 0;
    }

    /**
     * Checks if tags are available.
     *
     * @returns A boolean if they are available.
     */
    public isTagAvailable(): boolean {
        return !!this.tags && this.tags.length > 0;
    }

    /**
     * Checks motion-blocks are available.
     *
     * @returns A boolean if they are available.
     */
    public isMotionBlockAvailable(): boolean {
        return !!this.motionBlocks && this.motionBlocks.length > 0;
    }
}
