import openService from "../../services/open.js";
import TypeWidget from "./type_widget.js";
import fileWatcher from "../../services/file_watcher.js";
import server from "../../services/server.js";

const TPL = `
<div class="note-detail-file note-detail-printable">
    <style>
        .type-file .note-detail {
            height: 100%;
        }
        
        .note-detail-file {
            padding: 10px;
            height: 100%;
        }

        .file-preview-content {
            background-color: var(--accented-background-color);
            padding: 15px;
            height: 100%;
            overflow: auto;
            margin: 10px;
        }
    </style>
    
    <div class="file-watcher-wrapper alert alert-warning">
        <p>File <code class="file-watcher-path"></code> has been last modified on <span class="file-watcher-last-modified"></span>.</p> 
        
        <button class="btn btn-sm file-watcher-upload-button">Upload modified file</button>
    </div>
    
    <pre class="file-preview-content"></pre>
    
    <div class="file-preview-not-available alert alert-info">
        File preview is not available for this file format.
    </div>
    
    <iframe class="pdf-preview" style="width: 100%; height: 100%; flex-grow: 100;"></iframe>
    
    <video class="video-preview" controls></video>
    
    <audio class="audio-preview" controls></audio>
</div>`;

export default class FileTypeWidget extends TypeWidget {
    static getType() { return "file"; }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
        this.$previewContent = this.$widget.find(".file-preview-content");
        this.$previewNotAvailable = this.$widget.find(".file-preview-not-available");
        this.$pdfPreview = this.$widget.find(".pdf-preview");
        this.$videoPreview = this.$widget.find(".video-preview");
        this.$audioPreview = this.$widget.find(".audio-preview");

        this.$fileWatcherWrapper = this.$widget.find(".file-watcher-wrapper");
        this.$fileWatcherWrapper.hide();

        this.$fileWatcherPath = this.$widget.find(".file-watcher-path");
        this.$fileWatcherLastModified = this.$widget.find(".file-watcher-last-modified");
        this.$fileWatcherUploadButton = this.$widget.find(".file-watcher-upload-button");

        this.$fileWatcherUploadButton.on("click", async () => {
            await server.post(`notes/${this.noteId}/upload-modified-file`, {
                filePath: this.$fileWatcherPath.text()
            });

            fileWatcher.fileModificationUploaded(this.noteId);
            this.refreshFileWatchingStatus();
        });
    }

    async doRefresh(note) {
        this.$widget.show();

        const noteComplement = await this.tabContext.getNoteComplement();

        this.$previewContent.empty().hide();
        this.$pdfPreview.attr('src', '').empty().hide();
        this.$previewNotAvailable.hide();
        this.$videoPreview.hide();
        this.$audioPreview.hide();

        if (noteComplement.content) {
            this.$previewContent.show().scrollTop(0);
            this.$previewContent.text(noteComplement.content);
        }
        else if (note.mime === 'application/pdf') {
            this.$pdfPreview.show().attr("src", openService.getUrlForDownload("api/notes/" + this.noteId + "/open"));
        }
        else if (note.mime.startsWith('video/')) {
            this.$videoPreview
                .show()
                .attr("src", openService.getUrlForDownload("api/notes/" + this.noteId + "/open-partial"))
                .attr("type", this.note.mime)
                .css("width", this.$widget.width());
        }
        else if (note.mime.startsWith('audio/')) {
            this.$audioPreview
                .show()
                .attr("src", openService.getUrlForDownload("api/notes/" + this.noteId + "/open-partial"))
                .attr("type", this.note.mime)
                .css("width", this.$widget.width());
        }
        else {
            this.$previewNotAvailable.show();
        }

        this.refreshFileWatchingStatus();
    }

    refreshFileWatchingStatus() {
        const status = fileWatcher.getFileModificationStatus(this.noteId);

        this.$fileWatcherWrapper.toggle(!!status);

        if (status) {
            this.$fileWatcherPath.text(status.filePath);
            this.$fileWatcherLastModified.text(dayjs.unix(status.lastModifiedMs / 1000).format("HH:mm:ss"));
        }
    }

    openedFileUpdatedEvent(data) {
        this.refreshFileWatchingStatus();
    }
}
