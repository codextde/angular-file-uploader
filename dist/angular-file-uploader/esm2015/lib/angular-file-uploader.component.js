import { Component, EventEmitter, Input, Output, } from '@angular/core';
import { HttpClient, HttpEventType, } from '@angular/common/http';
export class AngularFileUploaderComponent {
    constructor(http) {
        this.http = http;
        this.resetUpload = false;
        // Outputs
        this.ApiResponse = new EventEmitter();
        this.everythingDone = new EventEmitter();
        this.allowedFiles = [];
        this.notAllowedFiles = [];
        this.Caption = [];
        this.isAllowedFileSingle = true;
        this.progressBarShow = false;
        this.enableUploadBtn = false;
        this.uploadMsg = false;
        this.afterUpload = false;
        this.uploadStarted = false;
        this.currentUploads = [];
        this.fileNameIndex = true;
        this.idDate = +new Date();
    }
    ngOnChanges(changes) {
        // Track changes in Configuration and see if user has even provided Configuration.
        if (changes.config && this.config) {
            // Assign User Configurations to Library Properties.
            this.theme = this.config.theme || '';
            this.id =
                this.config.id ||
                    parseInt((this.idDate / 10000).toString().split('.')[1], 10) +
                        Math.floor(Math.random() * 20) * 10000;
            this.hideProgressBar = this.config.hideProgressBar || false;
            this.hideResetBtn = this.config.hideResetBtn || false;
            this.hideSelectBtn = this.config.hideSelectBtn || false;
            this.maxSize = (this.config.maxSize || 20) * 1024000; // mb to bytes.
            this.uploadAPI = this.config.uploadAPI.url;
            this.method = this.config.uploadAPI.method || 'POST';
            this.formatsAllowed =
                this.config.formatsAllowed || '.jpg,.png,.pdf,.docx,.txt,.gif,.jpeg';
            this.multiple = this.config.multiple || false;
            this.headers = this.config.uploadAPI.headers || {};
            this.params = this.config.uploadAPI.params || {};
            this.responseType = this.config.uploadAPI.responseType || null;
            this.fileNameIndex = this.config.fileNameIndex === false ? false : true;
            this.replaceTexts = {
                selectFileBtn: this.multiple ? 'Select Files' : 'Select File',
                resetBtn: 'Reset',
                uploadBtn: 'Upload',
                dragNDropBox: 'Drag N Drop',
                attachPinBtn: this.multiple ? 'Attach Files...' : 'Attach File...',
                afterUploadMsg_success: 'Successfully Uploaded !',
                afterUploadMsg_error: 'Upload Failed !',
                sizeLimit: 'Size Limit',
            }; // default replaceText.
            if (this.config.replaceTexts) {
                // updated replaceText if user has provided any.
                this.replaceTexts = Object.assign(Object.assign({}, this.replaceTexts), this.config.replaceTexts);
            }
        }
        // Reset when resetUpload value changes from false to true.
        if (changes.resetUpload) {
            if (changes.resetUpload.currentValue === true) {
                this.resetFileUpload();
            }
        }
    }
    // Reset following properties.
    resetFileUpload() {
        this.allowedFiles = [];
        this.Caption = [];
        this.notAllowedFiles = [];
        this.uploadMsg = false;
        this.enableUploadBtn = false;
    }
    // When user selects files.
    onChange(event) {
        this.notAllowedFiles = [];
        const fileExtRegExp = /(?:\.([^.]+))?$/;
        let fileList;
        if (this.afterUpload || !this.multiple) {
            this.allowedFiles = [];
            this.Caption = [];
            this.afterUpload = false;
        }
        if (event.type === 'drop') {
            fileList = event.dataTransfer.files;
        }
        else {
            fileList = event.target.files || event.srcElement.files;
        }
        // 'forEach' does not exist on 'filelist' that's why this good old 'for' is used.
        for (let i = 0; i < fileList.length; i++) {
            const currentFileExt = fileExtRegExp
                .exec(fileList[i].name)[1]
                .toLowerCase(); // Get file extension.
            const isFormatValid = this.formatsAllowed.includes(currentFileExt);
            const isSizeValid = fileList[i].size <= this.maxSize;
            // Check whether current file format and size is correct as specified in the configurations.
            if (isFormatValid && isSizeValid) {
                this.allowedFiles.push(fileList[i]);
            }
            else {
                this.notAllowedFiles.push({
                    fileName: fileList[i].name,
                    fileSize: this.convertSize(fileList[i].size),
                    errorMsg: !isFormatValid ? 'Invalid format' : 'Invalid size',
                });
            }
        }
        // If there's any allowedFiles.
        if (this.allowedFiles.length > 0) {
            this.enableUploadBtn = true;
            // Upload the files directly if theme is attach pin (as upload btn is not there for this theme).
            if (this.theme === 'attachPin') {
                this.uploadFiles();
            }
        }
        else {
            this.enableUploadBtn = false;
        }
        this.uploadMsg = false;
        this.uploadStarted = false;
        this.uploadPercent = 0;
        event.target.value = null;
    }
    uploadFiles() {
        this.progressBarShow = true;
        this.uploadStarted = true;
        this.notAllowedFiles = [];
        let isError = false;
        this.isAllowedFileSingle = this.allowedFiles.length <= 1;
        const formData = new FormData();
        // Add data to be sent in this request
        this.allowedFiles.forEach((file, i) => {
            formData.append(this.Caption[i] || 'file' + (this.fileNameIndex ? i : ''), this.allowedFiles[i]);
        });
        /*
        Not Working, Headers null
        // Contruct Headers
        const headers = new HttpHeaders();
        for (const key of Object.keys(this.headers)) {
          headers.append(key, this.headers[key]);
        }
    
        // Contruct Params
        const params = new HttpParams();
        for (const key of Object.keys(this.params)) {
          params.append(key, this.params[key]);
        } */
        const options = {
            headers: this.headers,
            params: this.params,
        };
        if (this.responseType)
            options.responseType = this.responseType;
        this.http
            .request(this.method.toUpperCase(), this.uploadAPI, Object.assign({ body: formData, reportProgress: true, observe: 'events' }, options))
            .subscribe((event) => {
            // Upload Progress
            if (event.type === HttpEventType.UploadProgress) {
                this.enableUploadBtn = false; // button should be disabled if process uploading
                const currentDone = event.loaded / event.total;
                this.uploadPercent = Math.round((event.loaded / event.total) * 100);
            }
            else if (event.type === HttpEventType.Response) {
                if (event.status === 200 || event.status === 201) {
                    // Success
                    this.progressBarShow = false;
                    this.enableUploadBtn = false;
                    this.uploadMsg = true;
                    this.afterUpload = true;
                    if (!isError) {
                        this.uploadMsgText = this.replaceTexts.afterUploadMsg_success;
                        this.uploadMsgClass = 'text-success lead';
                    }
                }
                else {
                    // Failure
                    isError = true;
                    this.handleErrors();
                }
                this.ApiResponse.emit(event);
            }
            else {
                //console.log('Event Other: ', event);
            }
        }, (error) => {
            // Failure
            isError = true;
            this.handleErrors();
            this.ApiResponse.emit(error);
        });
    }
    handleErrors() {
        this.progressBarShow = false;
        this.enableUploadBtn = false;
        this.uploadMsg = true;
        this.afterUpload = true;
        this.uploadMsgText = this.replaceTexts.afterUploadMsg_error;
        this.uploadMsgClass = 'text-danger lead';
    }
    removeFile(i, sf_na) {
        if (sf_na === 'sf') {
            this.allowedFiles.splice(i, 1);
            this.Caption.splice(i, 1);
        }
        else {
            this.notAllowedFiles.splice(i, 1);
        }
        if (this.allowedFiles.length === 0) {
            this.enableUploadBtn = false;
        }
    }
    convertSize(fileSize) {
        return fileSize < 1024000
            ? (fileSize / 1024).toFixed(2) + ' KB'
            : (fileSize / 1024000).toFixed(2) + ' MB';
    }
    attachpinOnclick() {
        const element = document.getElementById('sel' + this.id);
        if (element !== null) {
            element.click();
        }
    }
    drop(event) {
        event.stopPropagation();
        event.preventDefault();
        this.onChange(event);
    }
    allowDrop(event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
}
AngularFileUploaderComponent.decorators = [
    { type: Component, args: [{
                selector: 'angular-file-uploader',
                template: "<div class=\"container\" *ngIf=\"(theme !== 'attachPin')\" id=\"default\">\r\n\r\n  <!-- Drag n Drop theme Starts -->\r\n  <div *ngIf=\"theme == 'dragNDrop'\" id=\"dragNDrop\"\r\n    [ngClass]=\"(hideSelectBtn && hideResetBtn) ? null : 'dragNDropBtmPad'\" class=\"dragNDrop\">\r\n    <div style=\"position:relative;\">\r\n      <div id=\"div1\" class=\"div1 afu-dragndrop-box\" (drop)=\"drop($event)\" (dragover)=\"allowDrop($event)\">\r\n        <p class=\"afu-dragndrop-text\">{{replaceTexts?.dragNDropBox}}</p>\r\n      </div>\r\n      <!-- <span class='label label-info' id=\"upload-file-info{{id}}\">{{allowedFiles[0]?.name}}</span> -->\r\n    </div>\r\n  </div>\r\n  <!-- Drag n Drop theme Ends -->\r\n  <label for=\"sel{{id}}\" class=\"btn btn-primary btn-sm afu-select-btn\"\r\n    *ngIf=\"!hideSelectBtn\">{{replaceTexts?.selectFileBtn}}</label>\r\n  <input type=\"file\" id=\"sel{{id}}\" style=\"display: none\" *ngIf=\"!hideSelectBtn\" (change)=\"onChange($event)\"\r\n    title=\"Select file\" name=\"files[]\" [accept]=formatsAllowed [attr.multiple]=\"multiple ? '' : null\" />\r\n  <button class=\"btn btn-info btn-sm resetBtn afu-reset-btn\" (click)=\"resetFileUpload()\"\r\n    *ngIf=\"!hideResetBtn\">{{replaceTexts?.resetBtn}}</button>\r\n  <br *ngIf=\"!hideSelectBtn\">\r\n  <p class=\"constraints-info afu-constraints-info\">({{formatsAllowed}}) {{replaceTexts?.sizeLimit}}: {{(convertSize(maxSize))}}\r\n  </p>\r\n  <!--Allowed file list-->\r\n  <div class=\"row afu-valid-file\" *ngFor=\"let sf of allowedFiles;let i=index\">\r\n    <p class=\"col-xs-3 textOverflow\"><span class=\"text-primary\">{{sf.name}}</span></p>\r\n    <p class=\"col-xs-3 padMarg sizeC\"><strong>({{convertSize(sf.size)}})</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>\r\n    <!--  <input class=\"col-xs-3 progress caption\"  type=\"text\"  placeholder=\"Caption..\"  [(ngModel)]=\"Caption[i]\"  *ngIf=\"!uploadStarted\"/> -->\r\n    <div class=\"progress col-xs-3 padMarg afu-progress-bar\" *ngIf=\"isAllowedFileSingle && progressBarShow && !hideProgressBar\">\r\n      <span class=\"progress-bar progress-bar-success\" role=\"progressbar\"\r\n        [ngStyle]=\"{'width':uploadPercent+'%'}\">{{uploadPercent}}%</span>\r\n    </div>\r\n    <a class=\"col-xs-1\" role=\"button\" (click)=\"removeFile(i,'sf')\" *ngIf=\"!uploadStarted\"><i class=\"fa fa-times\"></i></a>\r\n  </div>\r\n  <!--Not Allowed file list-->\r\n  <div class=\"row text-danger afu-invalid-file\" *ngFor=\"let na of notAllowedFiles;let j=index\">\r\n    <p class=\"col-xs-3 textOverflow\"><span>{{na['fileName']}}</span></p>\r\n    <p class=\"col-xs-3 padMarg sizeC\"><strong>({{na['fileSize']}})</strong></p>\r\n    <p class=\"col-xs-3 \">{{na['errorMsg']}}</p>\r\n    <a class=\"col-xs-1 delFileIcon\" role=\"button\" (click)=\"removeFile(j,'na')\" *ngIf=\"!uploadStarted\">&nbsp;<i\r\n        class=\"fa fa-times\"></i></a>\r\n  </div>\r\n\r\n  <p *ngIf=\"uploadMsg\" class=\"{{uploadMsgClass}} + afu-upload-status\">{{uploadMsgText}}<p>\r\n      <div *ngIf=\"!isAllowedFileSingle && progressBarShow && !hideProgressBar\">\r\n        <div class=\"progress col-xs-4 padMarg afu-progress-bar\">\r\n          <span class=\"progress-bar progress-bar-success\" role=\"progressbar\"\r\n            [ngStyle]=\"{'width':uploadPercent+'%'}\">{{uploadPercent}}%</span>\r\n        </div>\r\n        <br>\r\n        <br>\r\n      </div>\r\n      <button class=\"btn btn-success afu-upload-btn\" type=\"button\" (click)=\"uploadFiles()\"\r\n        [disabled]=!enableUploadBtn>{{replaceTexts?.uploadBtn}}</button>\r\n      <br>\r\n</div>\r\n\r\n<!--/////////////////////////// ATTACH PIN THEME  //////////////////////////////////////////////////////////-->\r\n<div *ngIf=\"theme == 'attachPin'\" id=\"attachPin\">\r\n  <div style=\"position:relative;padding-left:6px\">\r\n    <a class='btn up_btn afu-attach-pin' (click)=\"attachpinOnclick()\">\r\n      {{replaceTexts?.attachPinBtn}}\r\n      <i class=\"fa fa-paperclip\" aria-hidden=\"true\"></i>\r\n      <!-- <p style=\"margin-top:10px\">({{formatsAllowed}}) Size limit- {{(convertSize(maxSize))}}</p> -->\r\n      <input type=\"file\" id=\"sel{{id}}\" (change)=\"onChange($event)\" style=\"display: none\" title=\"Select file\"\r\n        name=\"files[]\" [accept]=formatsAllowed [attr.multiple]=\"multiple ? '' : null\" />\r\n      <br>\r\n    </a>\r\n    &nbsp;\r\n    <span class='label label-info' id=\"upload-file-info{{id}}\">{{allowedFiles[0]?.name}}</span>\r\n  </div>\r\n</div>\r\n\r\n",
                styles: [".constraints-info{font-style:italic;margin-top:10px}.padMarg{margin-bottom:0;padding:0}.caption{margin-right:5px}.textOverflow{overflow:hidden;padding-right:0;text-overflow:ellipsis;white-space:nowrap}.up_btn{background-color:transparent;border:2px solid #5c5b5b;border-radius:22px;color:#000}.delFileIcon{color:#ce0909;text-decoration:none}.dragNDrop .div1{border:2px dashed #5c5b5b;display:border-box;height:6rem;width:20rem}.dragNDrop .div1>p{color:#5c5b5b;font-weight:700;margin-top:1.4em;text-align:center}.dragNDropBtmPad{padding-bottom:2rem}@media screen and (max-width:620px){.caption{padding:0}}@media screen and (max-width:510px){.sizeC{width:25%}}@media screen and (max-width:260px){.caption,.sizeC{font-size:10px}}.resetBtn{margin-left:3px}"]
            },] }
];
AngularFileUploaderComponent.ctorParameters = () => [
    { type: HttpClient }
];
AngularFileUploaderComponent.propDecorators = {
    config: [{ type: Input }],
    resetUpload: [{ type: Input }],
    ApiResponse: [{ type: Output }],
    everythingDone: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ndWxhci1maWxlLXVwbG9hZGVyLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXItZmlsZS11cGxvYWRlci9zcmMvbGliL2FuZ3VsYXItZmlsZS11cGxvYWRlci5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCxZQUFZLEVBQ1osS0FBSyxFQUdMLE1BQU0sR0FFUCxNQUFNLGVBQWUsQ0FBQztBQU92QixPQUFPLEVBQ0wsVUFBVSxFQUdWLGFBQWEsR0FDZCxNQUFNLHNCQUFzQixDQUFDO0FBUTlCLE1BQU0sT0FBTyw0QkFBNEI7SUFtRHZDLFlBQW9CLElBQWdCO1FBQWhCLFNBQUksR0FBSixJQUFJLENBQVk7UUE3Q3BDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXBCLFVBQVU7UUFFVixnQkFBVyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFHakMsbUJBQWMsR0FBK0IsSUFBSSxZQUFZLEVBQWdCLENBQUM7UUFnQjlFLGlCQUFZLEdBQVcsRUFBRSxDQUFDO1FBQzFCLG9CQUFlLEdBSVQsRUFBRSxDQUFDO1FBQ1QsWUFBTyxHQUFhLEVBQUUsQ0FBQztRQUN2Qix3QkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDM0Isb0JBQWUsR0FBRyxLQUFLLENBQUM7UUFDeEIsb0JBQWUsR0FBRyxLQUFLLENBQUM7UUFDeEIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQUNsQixnQkFBVyxHQUFHLEtBQUssQ0FBQztRQUNwQixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUt0QixtQkFBYyxHQUFVLEVBQUUsQ0FBQztRQUMzQixrQkFBYSxHQUFHLElBQUksQ0FBQztRQUViLFdBQU0sR0FBVyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7SUFFRSxDQUFDO0lBRXhDLFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxrRkFBa0Y7UUFDbEYsSUFBSSxPQUFPLENB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RyxLQUFLLENBQUM7U0FDOUI7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWdCO1FBQzFCLE9BQU8sUUFBUSxHQUFHLE9BQU87WUFDdkIsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLO1lBQ3RDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzlDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNqQjtJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsS0FBVTtRQUNiLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN4QixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQVU7UUFDbEIsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3hCLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsWUFBWSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7SUFDekMsQ0FBQzs7O1lBN1NGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsdUJBQXVCO2dCQUNqQyx1NklBQXFEOzthQUV0RDs7O1lBWEMsVUFBVTs7O3FCQWNULEtBQUs7MEJBR0wsS0FBSzswQkFJTCxNQUFNOzZCQUdOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIENvbXBvbmVudCxcclxuICBFdmVudEVtaXR0ZXIsXHJcbiAgSW5wdXQsXHJcbiAgT25DaGFuZ2VzLFxyXG4gIE9uSW5pdCxcclxuICBPdXRwdXQsXHJcbiAgU2ltcGxlQ2hhbmdlcyxcclxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHtcclxuICBSZXBsYWNlVGV4dHMsXHJcbiAgQW5ndWxhckZpbGVVcGxvYWRlckNvbmZpZyxcclxuICBVcGxvYWRJbmZvLFxyXG4gIFVwbG9hZEFwaSxcclxufSBmcm9tICcuL2FuZ3VsYXItZmlsZS11cGxvYWRlci50eXBlcyc7XHJcbmltcG9ydCB7XHJcbiAgSHR0cENsaWVudCxcclxuICBIdHRwSGVhZGVycyxcclxuICBIdHRwUGFyYW1zLFxyXG4gIEh0dHBFdmVudFR5cGUsXHJcbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xyXG5pbXBvcnQgeyBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XHJcblxyXG5AQ29tcG9uZW50KHtcclxuICBzZWxlY3RvcjogJ2FuZ3VsYXItZmlsZS11cGxvYWRlcicsXHJcbiAgdGVtcGxhdGVVcmw6ICcuL2FuZ3VsYXItZmlsZS11cGxvYWRlci5jb21wb25lbnQuaHRtbCcsXHJcbiAgc3R5bGVVcmxzOiBbJy4vYW5ndWxhci1maWxlLXVwbG9hZGVyLmNvbXBvbmVudC5jc3MnXSxcclxufSlcclxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJGaWxlVXBsb2FkZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkNoYW5nZXMge1xyXG4gIC8vIElucHV0c1xyXG4gIEBJbnB1dCgpXHJcbiAgY29uZmlnOiBBbmd1bGFyRmlsZVVwbG9hZGVyQ29uZmlnO1xyXG5cclxuICBASW5wdXQoKVxyXG4gIHJlc2V0VXBsb2FkID0gZmFsc2U7XHJcblxyXG4gIC8vIE91dHB1dHNcclxuICBAT3V0cHV0KClcclxuICBBcGlSZXNwb25zZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbiAgQE91dHB1dCgpXHJcbiAgZXZlcnl0aGluZ0RvbmU6IEV2ZW50RW1pdHRlcjxVcGxvYWRJbmZvW10+ID0gbmV3IEV2ZW50RW1pdHRlcjxVcGxvYWRJbmZvW10+KCk7XHJcblxyXG4gIC8vIFByb3BlcnRpZXNcclxuICB0aGVtZTogc3RyaW5nO1xyXG4gIGlkOiBudW1iZXI7XHJcbiAgaGlkZVByb2dyZXNzQmFyOiBib29sZWFuO1xyXG4gIG1heFNpemU6IG51bWJlcjtcclxuICB1cGxvYWRBUEk6IHN0cmluZztcclxuICBtZXRob2Q6IHN0cmluZztcclxuICBmb3JtYXRzQWxsb3dlZDogc3RyaW5nO1xyXG4gIG11bHRpcGxlOiBib29sZWFuO1xyXG4gIGhlYWRlcnM6IEh0dHBIZWFkZXJzIHwgeyBbaGVhZGVyOiBzdHJpbmddOiBzdHJpbmcgfCBzdHJpbmdbXSB9O1xyXG4gIHBhcmFtczogSHR0cFBhcmFtcyB8IHsgW3BhcmFtOiBzdHJpbmddOiBzdHJpbmcgfCBzdHJpbmdbXSB9O1xyXG4gIHJlc3BvbnNlVHlwZTogc3RyaW5nO1xyXG4gIGhpZGVSZXNldEJ0bjogYm9vbGVhbjtcclxuICBoaWRlU2VsZWN0QnRuOiBib29sZWFuO1xyXG4gIGFsbG93ZWRGaWxlczogRmlsZVtdID0gW107XHJcbiAgbm90QWxsb3dlZEZpbGVzOiB7XHJcbiAgICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gICAgZmlsZVNpemU6IHN0cmluZztcclxuICAgIGVycm9yTXNnOiBzdHJpbmc7XHJcbiAgfVtdID0gW107XHJcbiAgQ2FwdGlvbjogc3RyaW5nW10gPSBbXTtcclxuICBpc0FsbG93ZWRGaWxlU2luZ2xlID0gdHJ1ZTtcclxuICBwcm9ncmVzc0JhclNob3cgPSBmYWxzZTtcclxuICBlbmFibGVVcGxvYWRCdG4gPSBmYWxzZTtcclxuICB1cGxvYWRNc2cgPSBmYWxzZTtcclxuICBhZnRlclVwbG9hZCA9IGZhbHNlO1xyXG4gIHVwbG9hZFN0YXJ0ZWQgPSBmYWxzZTtcclxuICB1cGxvYWRNc2dUZXh0OiBzdHJpbmc7XHJcbiAgdXBsb2FkTXNnQ2xhc3M6IHN0cmluZztcclxuICB1cGxvYWRQZXJjZW50OiBudW1iZXI7XHJcbiAgcmVwbGFjZVRleHRzOiBSZXBsYWNlVGV4dHM7XHJcbiAgY3VycmVudFVwbG9hZHM6IGFueVtdID0gW107XHJcbiAgZmlsZU5hbWVJbmRleCA9IHRydWU7XHJcblxyXG4gIHByaXZhdGUgaWREYXRlOiBudW1iZXIgPSArbmV3IERhdGUoKTtcclxuXHJcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBodHRwOiBIdHRwQ2xpZW50KSB7fVxyXG5cclxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XHJcbiAgICAvLyBUcmFjayBjaGFuZ2VzIGluIENvbmZpZ3VyYXRpb24gYW5kIHNlZSBpZiB1c2VyIGhhcyBldmVuIHByb3ZpZGVkIENvbmZpZ3VyYXRpb24uXHJcbiAgICBpZiAoY2hhbmdlcy5jb25maWcgJiYgdGhpcy5jb25maWcpIHtcclxuICAgICAgLy8gQXNzaWduIFVzZXIgQ29uZmlndXJhdGlvbnMgdG8gTGlicmFyeSBQcm9wZXJ0aWVzLlxyXG4gICAgICB0aGlzLnRoZW1lID0gdGhpcy5jb25maWcudGhlbWUgfHwgJyc7XHJcbiAgICAgIHRoaXMuaWQgPVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmlkIHx8XHJcbiAgICAgICAgcGFyc2VJbnQoKHRoaXMuaWREYXRlIC8gMTAwMDApLnRvU3RyaW5nKCkuc3BsaXQoJy4nKVsxXSwgMTApICtcclxuICAgICAgICAgIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwKSAqIDEwMDAwO1xyXG4gICAgICB0aGlzLmhpZGVQcm9ncmVzc0JhciA9IHRoaXMuY29uZmlnLmhpZGVQcm9ncmVzc0JhciB8fCBmYWxzZTtcclxuICAgICAgdGhpcy5oaWRlUmVzZXRCdG4gPSB0aGlzLmNvbmZpZy5oaWRlUmVzZXRCdG4gfHwgZmFsc2U7XHJcbiAgICAgIHRoaXMuaGlkZVNlbGVjdEJ0biA9IHRoaXMuY29uZmlnLmhpZGVTZWxlY3RCdG4gfHwgZmFsc2U7XHJcbiAgICAgIHRoaXMubWF4U2l6ZSA9ICh0aGlzLmNvbmZpZy5tYXhTaXplIHx8IDIwKSAqIDEwMjQwMDA7IC8vIG1iIHRvIGJ5dGVzLlxyXG4gICAgICB0aGlzLnVwbG9hZEFQSSA9IHRoaXMuY29uZmlnLnVwbG9hZEFQSS51cmw7XHJcbiAgICAgIHRoaXMubWV0aG9kID0gdGhpcy5jb25maWcudXBsb2FkQVBJLm1ldGhvZCB8fCAnUE9TVCc7XHJcbiAgICAgIHRoaXMuZm9ybWF0c0FsbG93ZWQgPVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmZvcm1hdHNBbGxvd2VkIHx8ICcuanBnLC5wbmcsLnBkZiwuZG9jeCwudHh0LC5naWYsLmpwZWcnO1xyXG4gICAgICB0aGlzLm11bHRpcGxlID0gdGhpcy5jb25maWcubXVsdGlwbGUgfHwgZmFsc2U7XHJcbiAgICAgIHRoaXMuaGVhZGVycyA9IHRoaXMuY29uZmlnLnVwbG9hZEFQSS5oZWFkZXJzIHx8IHt9O1xyXG4gICAgICB0aGlzLnBhcmFtcyA9IHRoaXMuY29uZmlnLnVwbG9hZEFQSS5wYXJhbXMgfHwge307XHJcbiAgICAgIHRoaXMucmVzcG9uc2VUeXBlID0gdGhpcy5jb25maWcudXBsb2FkQVBJLnJlc3BvbnNlVHlwZSB8fCBudWxsO1xyXG4gICAgICB0aGlzLmZpbGVOYW1lSW5kZXggPSB0aGlzLmNvbmZpZy5maWxlTmFtZUluZGV4ID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZTtcclxuICAgICAgdGhpcy5yZXBsYWNlVGV4dHMgPSB7XHJcbiAgICAgICAgc2VsZWN0RmlsZUJ0bjogdGhpcy5tdWx0aXBsZSA/ICdTZWxlY3QgRmlsZXMnIDogJ1NlbGVjdCBGaWxlJyxcclxuICAgICAgICByZXNldEJ0bjogJ1Jlc2V0JyxcclxuICAgICAgICB1cGxvYWRCdG46ICdVcGxvYWQnLFxyXG4gICAgICAgIGRyYWdORHJvcEJveDogJ0RyYWcgTiBEcm9wJyxcclxuICAgICAgICBhdHRhY2hQaW5CdG46IHRoaXMubXVsdGlwbGUgPyAnQXR0YWNoIEZpbGVzLi4uJyA6ICdBdHRhY2ggRmlsZS4uLicsXHJcbiAgICAgICAgYWZ0ZXJVcGxvYWRNc2dfc3VjY2VzczogJ1N1Y2Nlc3NmdWxseSBVcGxvYWRlZCAhJyxcclxuICAgICAgICBhZnRlclVwbG9hZE1zZ19lcnJvcjogJ1VwbG9hZCBGYWlsZWQgIScsXHJcbiAgICAgICAgc2l6ZUxpbWl0OiAnU2l6ZSBMaW1pdCcsXHJcbiAgICAgIH07IC8vIGRlZmF1bHQgcmVwbGFjZVRleHQuXHJcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5yZXBsYWNlVGV4dHMpIHtcclxuICAgICAgICAvLyB1cGRhdGVkIHJlcGxhY2VUZXh0IGlmIHVzZXIgaGFzIHByb3ZpZGVkIGFueS5cclxuICAgICAgICB0aGlzLnJlcGxhY2VUZXh0cyA9IHtcclxuICAgICAgICAgIC4uLnRoaXMucmVwbGFjZVRleHRzLFxyXG4gICAgICAgICAgLi4udGhpcy5jb25maWcucmVwbGFjZVRleHRzLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBSZXNldCB3aGVuIHJlc2V0VXBsb2FkIHZhbHVlIGNoYW5nZXMgZnJvbSBmYWxzZSB0byB0cnVlLlxyXG4gICAgaWYgKGNoYW5nZXMucmVzZXRVcGxvYWQpIHtcclxuICAgICAgaWYgKGNoYW5nZXMucmVzZXRVcGxvYWQuY3VycmVudFZhbHVlID09PSB0cnVlKSB7XHJcbiAgICAgICAgdGhpcy5yZXNldEZpbGVVcGxvYWQoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIC8vIFJlc2V0IGZvbGxvd2luZyBwcm9wZXJ0aWVzLlxyXG4gIHJlc2V0RmlsZVVwbG9hZCgpIHtcclxuICAgIHRoaXMuYWxsb3dlZEZpbGVzID0gW107XHJcbiAgICB0aGlzLkNhcHRpb24gPSBbXTtcclxuICAgIHRoaXMubm90QWxsb3dlZEZpbGVzID0gW107XHJcbiAgICB0aGlzLnVwbG9hZE1zZyA9IGZhbHNlO1xyXG4gICAgdGhpcy5lbmFibGVVcGxvYWRCdG4gPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIFdoZW4gdXNlciBzZWxlY3RzIGZpbGVzLlxyXG4gIG9uQ2hhbmdlKGV2ZW50OiBhbnkpIHtcclxuXHJcbiAgICB0aGlzLm5vdEFsbG93ZWRGaWxlcyA9IFtdO1xyXG4gICAgY29uc3QgZmlsZUV4dFJlZ0V4cDogUmVnRXhwID0gLyg/OlxcLihbXi5dKykpPyQvO1xyXG4gICAgbGV0IGZpbGVMaXN0OiBGaWxlTGlzdDtcclxuXHJcbiAgICBpZiAodGhpcy5hZnRlclVwbG9hZCB8fCAhdGhpcy5tdWx0aXBsZSkge1xyXG4gICAgICB0aGlzLmFsbG93ZWRGaWxlcyA9IFtdO1xyXG4gICAgICB0aGlzLkNhcHRpb24gPSBbXTtcclxuICAgICAgdGhpcy5hZnRlclVwbG9hZCA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChldmVudC50eXBlID09PSAnZHJvcCcpIHtcclxuICAgICAgZmlsZUxpc3QgPSBldmVudC5kYXRhVHJhbnNmZXIuZmlsZXM7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmaWxlTGlzdCA9IGV2ZW50LnRhcmdldC5maWxlcyB8fCBldmVudC5zcmNFbGVtZW50LmZpbGVzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vICdmb3JFYWNoJyBkb2VzIG5vdCBleGlzdCBvbiAnZmlsZWxpc3QnIHRoYXQncyB3aHkgdGhpcyBnb29kIG9sZCAnZm9yJyBpcyB1c2VkLlxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBjdXJyZW50RmlsZUV4dCA9IGZpbGVFeHRSZWdFeHBcclxuICAgICAgICAuZXhlYyhmaWxlTGlzdFtpXS5uYW1lKVsxXVxyXG4gICAgICAgIC50b0xvd2VyQ2FzZSgpOyAvLyBHZXQgZmlsZSBleHRlbnNpb24uXHJcbiAgICAgIGNvbnN0IGlzRm9ybWF0VmFsaWQgPSB0aGlzLmZvcm1hdHNBbGxvd2VkLmluY2x1ZGVzKGN1cnJlbnRGaWxlRXh0KTtcclxuXHJcbiAgICAgIGNvbnN0IGlzU2l6ZVZhbGlkID0gZmlsZUxpc3RbaV0uc2l6ZSA8PSB0aGlzLm1heFNpemU7XHJcblxyXG4gICAgICAvLyBDaGVjayB3aGV0aGVyIGN1cnJlbnQgZmlsZSBmb3JtYXQgYW5kIHNpemUgaXMgY29ycmVjdCBhcyBzcGVjaWZpZWQgaW4gdGhlIGNvbmZpZ3VyYXRpb25zLlxyXG4gICAgICBpZiAoaXNGb3JtYXRWYWxpZCAmJiBpc1NpemVWYWxpZCkge1xyXG4gICAgICAgIHRoaXMuYWxsb3dlZEZpbGVzLnB1c2goZmlsZUxpc3RbaV0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubm90QWxsb3dlZEZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgZmlsZU5hbWU6IGZpbGVMaXN0W2ldLm5hbWUsXHJcbiAgICAgICAgICBmaWxlU2l6ZTogdGhpcy5jb252ZXJ0U2l6ZShmaWxlTGlzdFtpXS5zaXplKSxcclxuICAgICAgICAgIGVycm9yTXNnOiAhaXNGb3JtYXRWYWxpZCA/ICdJbnZhbGlkIGZvcm1hdCcgOiAnSW52YWxpZCBzaXplJyxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHRoZXJlJ3MgYW55IGFsbG93ZWRGaWxlcy5cclxuICAgIGlmICh0aGlzLmFsbG93ZWRGaWxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuZW5hYmxlVXBsb2FkQnRuID0gdHJ1ZTtcclxuICAgICAgLy8gVXBsb2FkIHRoZSBmaWxlcyBkaXJlY3RseSBpZiB0aGVtZSBpcyBhdHRhY2ggcGluIChhcyB1cGxvYWQgYnRuIGlzIG5vdCB0aGVyZSBmb3IgdGhpcyB0aGVtZSkuXHJcbiAgICAgIGlmICh0aGlzLnRoZW1lID09PSAnYXR0YWNoUGluJykge1xyXG4gICAgICAgIHRoaXMudXBsb2FkRmlsZXMoKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5lbmFibGVVcGxvYWRCdG4gPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVwbG9hZE1zZyA9IGZhbHNlO1xyXG4gICAgdGhpcy51cGxvYWRTdGFydGVkID0gZmFsc2U7XHJcbiAgICB0aGlzLnVwbG9hZFBlcmNlbnQgPSAwO1xyXG4gICAgZXZlbnQudGFyZ2V0LnZhbHVlID0gbnVsbDtcclxuICB9XHJcblxyXG4gIHVwbG9hZEZpbGVzKCkge1xyXG4gICAgdGhpcy5wcm9ncmVzc0JhclNob3cgPSB0cnVlO1xyXG4gICAgdGhpcy51cGxvYWRTdGFydGVkID0gdHJ1ZTtcclxuICAgIHRoaXMubm90QWxsb3dlZEZpbGVzID0gW107XHJcbiAgICBsZXQgaXNFcnJvciA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc0FsbG93ZWRGaWxlU2luZ2xlID0gdGhpcy5hbGxvd2VkRmlsZXMubGVuZ3RoIDw9IDE7XHJcbiAgICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xyXG5cclxuICAgIC8vIEFkZCBkYXRhIHRvIGJlIHNlbnQgaW4gdGhpcyByZXF1ZXN0XHJcbiAgICB0aGlzLmFsbG93ZWRGaWxlcy5mb3JFYWNoKChmaWxlLCBpKSA9PiB7XHJcbiAgICAgIGZvcm1EYXRhLmFwcGVuZChcclxuICAgICAgICB0aGlzLkNhcHRpb25baV0gfHwgJ2ZpbGUnICsgKHRoaXMuZmlsZU5hbWVJbmRleCA/IGkgOiAnJyksXHJcbiAgICAgICAgdGhpcy5hbGxvd2VkRmlsZXNbaV1cclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8qXHJcbiAgICBOb3QgV29ya2luZywgSGVhZGVycyBudWxsXHJcbiAgICAvLyBDb250cnVjdCBIZWFkZXJzXHJcbiAgICBjb25zdCBoZWFkZXJzID0gbmV3IEh0dHBIZWFkZXJzKCk7XHJcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLmhlYWRlcnMpKSB7XHJcbiAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdGhpcy5oZWFkZXJzW2tleV0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbnRydWN0IFBhcmFtc1xyXG4gICAgY29uc3QgcGFyYW1zID0gbmV3IEh0dHBQYXJhbXMoKTtcclxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMucGFyYW1zKSkge1xyXG4gICAgICBwYXJhbXMuYXBwZW5kKGtleSwgdGhpcy5wYXJhbXNba2V5XSk7XHJcbiAgICB9ICovXHJcblxyXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgaGVhZGVyczogdGhpcy5oZWFkZXJzLFxyXG4gICAgICBwYXJhbXM6IHRoaXMucGFyYW1zLFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAodGhpcy5yZXNwb25zZVR5cGUpIChvcHRpb25zIGFzIGFueSkucmVzcG9uc2VUeXBlID0gdGhpcy5yZXNwb25zZVR5cGU7XHJcblxyXG4gICAgdGhpcy5odHRwXHJcbiAgICAgIC5yZXF1ZXN0KHRoaXMubWV0aG9kLnRvVXBwZXJDYXNlKCksIHRoaXMudXBsb2FkQVBJLCB7XHJcbiAgICAgICAgYm9keTogZm9ybURhdGEsXHJcbiAgICAgICAgcmVwb3J0UHJvZ3Jlc3M6IHRydWUsXHJcbiAgICAgICAgb2JzZXJ2ZTogJ2V2ZW50cycsXHJcbiAgICAgICAgLi4ub3B0aW9ucyxcclxuICAgICAgfSlcclxuICAgICAgLnN1YnNjcmliZShcclxuICAgICAgICAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIC8vIFVwbG9hZCBQcm9ncmVzc1xyXG4gICAgICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEh0dHBFdmVudFR5cGUuVXBsb2FkUHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgdGhpcy5lbmFibGVVcGxvYWRCdG4gPSBmYWxzZTsgLy8gYnV0dG9uIHNob3VsZCBiZSBkaXNhYmxlZCBpZiBwcm9jZXNzIHVwbG9hZGluZ1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RG9uZSA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xyXG4gICAgICAgICAgICB0aGlzLnVwbG9hZFBlcmNlbnQgPSBNYXRoLnJvdW5kKChldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCkgKiAxMDApO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBIdHRwRXZlbnRUeXBlLlJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmIChldmVudC5zdGF0dXMgPT09IDIwMCB8fCBldmVudC5zdGF0dXMgPT09IDIwMSkge1xyXG4gICAgICAgICAgICAgIC8vIFN1Y2Nlc3NcclxuICAgICAgICAgICAgICB0aGlzLnByb2dyZXNzQmFyU2hvdyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIHRoaXMuZW5hYmxlVXBsb2FkQnRuID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgdGhpcy51cGxvYWRNc2cgPSB0cnVlO1xyXG4gICAgICAgICAgICAgIHRoaXMuYWZ0ZXJVcGxvYWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgIGlmICghaXNFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGxvYWRNc2dUZXh0ID0gdGhpcy5yZXBsYWNlVGV4dHMuYWZ0ZXJVcGxvYWRNc2dfc3VjY2VzcztcclxuICAgICAgICAgICAgICAgIHRoaXMudXBsb2FkTXNnQ2xhc3MgPSAndGV4dC1zdWNjZXNzIGxlYWQnO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBGYWlsdXJlXHJcbiAgICAgICAgICAgICAgaXNFcnJvciA9IHRydWU7XHJcbiAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcnMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5BcGlSZXNwb25zZS5lbWl0KGV2ZW50KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0V2ZW50IE90aGVyOiAnLCBldmVudCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICAoZXJyb3IpID0+IHtcclxuICAgICAgICAgIC8vIEZhaWx1cmVcclxuICAgICAgICAgIGlzRXJyb3IgPSB0cnVlO1xyXG4gICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcnMoKTtcclxuICAgICAgICAgIHRoaXMuQXBpUmVzcG9uc2UuZW1pdChlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlRXJyb3JzKCkge1xyXG4gICAgdGhpcy5wcm9ncmVzc0JhclNob3cgPSBmYWxzZTtcclxuICAgIHRoaXMuZW5hYmxlVXBsb2FkQnRuID0gZmFsc2U7XHJcbiAgICB0aGlzLnVwbG9hZE1zZyA9IHRydWU7XHJcbiAgICB0aGlzLmFmdGVyVXBsb2FkID0gdHJ1ZTtcclxuICAgIHRoaXMudXBsb2FkTXNnVGV4dCA9IHRoaXMucmVwbGFjZVRleHRzLmFmdGVyVXBsb2FkTXNnX2Vycm9yO1xyXG4gICAgdGhpcy51cGxvYWRNc2dDbGFzcyA9ICd0ZXh0LWRhbmdlciBsZWFkJztcclxuICB9XHJcblxyXG4gIHJlbW92ZUZpbGUoaTogYW55LCBzZl9uYTogYW55KSB7XHJcbiAgICBpZiAoc2ZfbmEgPT09ICdzZicpIHtcclxuICAgICAgdGhpcy5hbGxvd2VkRmlsZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgICB0aGlzLkNhcHRpb24uc3BsaWNlKGksIDEpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5ub3RBbGxvd2VkRmlsZXMuc3BsaWNlKGksIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmFsbG93ZWRGaWxlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgdGhpcy5lbmFibGVVcGxvYWRCdG4gPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnZlcnRTaXplKGZpbGVTaXplOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZpbGVTaXplIDwgMTAyNDAwMFxyXG4gICAgICA/IChmaWxlU2l6ZSAvIDEwMjQpLnRvRml4ZWQoMikgKyAnIEtCJ1xyXG4gICAgICA6IChmaWxlU2l6ZSAvIDEwMjQwMDApLnRvRml4ZWQoMikgKyAnIE1CJztcclxuICB9XHJcblxyXG4gIGF0dGFjaHBpbk9uY2xpY2soKSB7XHJcbiAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NlbCcgKyB0aGlzLmlkKTtcclxuICAgIGlmIChlbGVtZW50ICE9PSBudWxsKSB7XHJcbiAgICAgIGVsZW1lbnQuY2xpY2soKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGRyb3AoZXZlbnQ6IGFueSkge1xyXG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdGhpcy5vbkNoYW5nZShldmVudCk7XHJcbiAgfVxyXG5cclxuICBhbGxvd0Ryb3AoZXZlbnQ6IGFueSkge1xyXG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnY29weSc7XHJcbiAgfVxyXG59XHJcbiJdfQ==