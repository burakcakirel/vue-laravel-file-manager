<template>
    <div class="fm-table">
        <table class="table table-sm">
            <thead>
                <tr>
                    <th class="w-65" v-on:click="sortBy('name')">
                        {{ lang.manager.table.name }}
                        <template v-if="sortSettings.field === 'name'">
                            <i class="fas fa-sort-amount-down"
                               v-show="sortSettings.direction === 'down'"/>
                            <i class="fas fa-sort-amount-up"
                               v-show="sortSettings.direction === 'up'"/>
                        </template>
                    </th>
                    <th class="w-10" v-on:click="sortBy('size')">
                        {{ lang.manager.table.size }}
                        <template v-if="sortSettings.field === 'size'">
                            <i class="fas fa-sort-amount-down"
                               v-show="sortSettings.direction === 'down'"/>
                            <i class="fas fa-sort-amount-up"
                               v-show="sortSettings.direction === 'up'"/>
                        </template>
                    </th>
                    <th class="w-10" v-on:click="sortBy('type')">
                        {{ lang.manager.table.type }}
                        <template v-if="sortSettings.field === 'type'">
                            <i class="fas fa-sort-amount-down"
                               v-show="sortSettings.direction === 'down'"/>
                            <i class="fas fa-sort-amount-up"
                               v-show="sortSettings.direction === 'up'"/>
                        </template>
                    </th>
                    <th class="w-auto" v-on:click="sortBy('date')">
                        {{ lang.manager.table.date }}
                        <template v-if="sortSettings.field === 'date'">
                            <i class="fas fa-sort-amount-down"
                               v-show="sortSettings.direction === 'down'"/>
                            <i class="fas fa-sort-amount-up"
                               v-show="sortSettings.direction === 'up'"/>
                        </template>
                    </th>
                </tr>
            </thead>
            <draggable tag="tbody" v-model="list" multi-drag selected-class="table-info" @unchoose="onUnChoose" :move="onMove" @update="onUpdate" @clone="onClone" @sort="onSort">
                <tr v-if="!isRootPath">
                    <td colspan="4" class="fm-content-item" v-on:click="levelUp">
                        <i class="fas fa-level-up-alt"/>
                    </td>
                </tr>
                <tr v-for="(directory, index) in directories"
                    v-bind:key="`d-${index}`"
                    v-bind:class="{'table-info': checkSelect('directories', directory.path)}"
                    v-on:click="selectItem('directories', directory.path, $event)"
                    v-on:contextmenu.prevent="contextMenu(directory, $event)">
                    <td class="fm-content-item unselectable"
                        v-bind:class="(acl && directory.acl === 0) ? 'text-hidden' : ''"
                        v-on:dblclick="selectDirectory(directory.path)">
                        <i class="far fa-folder"/> {{ directory.basename }}
                    </td>
                    <td/>
                    <td>{{ lang.manager.table.folder }}</td>
                    <td>
                        {{ timestampToDate(directory.timestamp) }}
                    </td>
                </tr>
                <tr v-for="(file, index) in files"
                    v-bind:key="`f-${index}`"
                    v-bind:class="{'table-info': checkSelect('files', file.path)}"
                    v-on:click="selectItem('files', file.path, $event)"
                    v-on:dblclick="selectAction(file.path, file.extension)"
                    v-on:contextmenu.prevent="contextMenu(file, $event)">
                    <td class="fm-content-item unselectable"
                        v-bind:class="(acl && file.acl === 0) ? 'text-hidden' : ''">
                        <i class="far" v-bind:class="extensionToIcon(file.extension)"/>
                        {{ file.filename ? file.filename : file.basename }}
                    </td>
                    <td>{{ bytesToHuman(file.size) }}</td>
                    <td>
                        {{ file.extension }}
                    </td>
                    <td>
                        {{ timestampToDate(file.timestamp) }}
                    </td>
                </tr>
            </draggable>
        </table>
    </div>
</template>

<script>
import draggable from 'vuedraggable';
import translate from '../../mixins/translate';
import helper from '../../mixins/helper';
import managerHelper from './mixins/manager';

export default {
  name: 'table-view',
  mixins: [translate, helper, managerHelper],
  components: { draggable },
  props: {
    manager: { type: String, required: true },
  },
  computed: {
    /**
     * Sort settings
     * @returns {*}
     */
    sortSettings() {
      return this.$store.state.fm[this.manager].sort;
    },
    list: {
      get() {
        const dirs = this.$store.getters[`fm/${this.manager}/directories`];
        const files = this.$store.getters[`fm/${this.manager}/files`];
        // filesAndFolders.push(this.$store.state.fm[this.manager].directories);
        // dirs.push(this.$store.state.fm[this.manager].files);
        return dirs.concat(files);
      },
      // eslint-disable-next-line no-unused-vars
      set(value) {
        // this.$store.commit('updateList', value);
      },
    },
  },
  methods: {
    /**
     * Sort by field
     * @param field
     */
    sortBy(field) {
      this.$store.dispatch(`fm/${this.manager}/sortBy`, { field, direction: null });
    },
    findDirectoryIndex: (state, path) => state.fm.tree.directories.findIndex((el) => el.basename === path),
    onUnChoose(event) {
      if (event.originalEvent.type !== 'drop') {
        return;
      }

      const selectedDir = this.$store.state.fm[this.manager].selectedDirectory;
      let file = {};
      let directory = {};
      let cancelEvent = false;
      let dropTree = false;
      const { list } = this;
      let items = this.list;
      let targetIndex = event.originalEvent.target.parentElement.sectionRowIndex;

      if (event.originalEvent.target.classList.contains('fm-tree-item')) {
        dropTree = true;
        items = this.$store.getters['fm/tree/directories'];
        targetIndex = this.findDirectoryIndex(this.$store.state, event.originalEvent.target.textContent.trim());
      }

      this.$store.commit(`fm/${this.manager}/resetSelected`);

      if (event.oldIndicies.length === 0) {
        event.oldIndicies.push({ index: event.oldIndex });
      }

      event.oldIndicies.forEach((element) => {
        if (selectedDir === null) {
          file = list[element.index];
          directory = items[targetIndex];
        } else {
          file = list[element.index - 1];

          if (dropTree) {
            directory = items[targetIndex];
          } else if (targetIndex === 0) {
            const pathUp = selectedDir.split('/').slice(0, -1).join('/');

            directory = { path: pathUp, type: 'pathUp' };
          } else {
            directory = items[targetIndex - 1];
          }
        }

        if (directory.type === 'file' || file.type === 'dir') {
          cancelEvent = true;
          return;
        }

        const type = 'files';

        this.$store.commit(`fm/${this.manager}/setSelected`, { type, path: file.path });
      });

      if (cancelEvent) {
        return;
      }

      this.$store.dispatch('fm/toClipboard', 'cut');

      this.$store.commit(`fm/${this.manager}/setSelectedDirectory`, directory.path);
      this.$store.dispatch('fm/paste');

      // load directory
      if (selectedDir === null) {
        this.$store.commit(`fm/${this.manager}/setSelectedDirectory`, null);
        this.$store.dispatch(`fm/${this.manager}/selectDirectory`, { path: null });
      } else if (directory.type === 'pathUp' || dropTree) {
        this.$store.commit(`fm/${this.manager}/setSelectedDirectory`, selectedDir);
        this.$store.dispatch(`fm/${this.manager}/selectDirectory`, { path: selectedDir });
      } else {
        const pathUp = directory.path.split('/').slice(0, -1).join('/');

        this.$store.commit(`fm/${this.manager}/setSelectedDirectory`, pathUp);
        this.$store.dispatch(`fm/${this.manager}/selectDirectory`, { path: pathUp });
      }

      // this.$store.dispatch(`fm/${this.manager}/selectDirectory`, { path: selectedDir.path || null, history: true });

      // console.log(event);
    },
    onMove(event) {
      console.log(event);
      console.log('onmove');

      // return false;
    },
    onUpdate() {
      console.log('onupdate');

      return false;
    },
    onSort(event) {
      console.log(event);

      return false;
    },
    onClone() {
      console.log('onsort');

      return false;
    },
  },
};
</script>

<style lang="scss">
    .fm-table {

        thead th{
            background: white;
            position: sticky;
            top: 0;
            z-index: 10;
            cursor: pointer;
            border-top: none;

            &:hover {
                background-color: #f8f9fa;
            }

            & > i {
                padding-left: 0.5rem;
            }
        }

        td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        tr:hover {
            background-color: #f8f9fa;
        }

        .w-10 {
            width: 10%;
        }

        .w-65 {
            width: 65%;
        }

        .fm-content-item {
            cursor: pointer;
            max-width: 1px;
        }

        .text-hidden {
            color: #cdcdcd;
        }
    }
</style>
