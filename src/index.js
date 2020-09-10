class LegacyStoragePlugin {

  constructor(anno, config) {
    anno.on('createAnnotation', this.onCreateAnnotation);
    anno.on('updateAnnotation', this.onUpdateAnnotation);
    anno.on('deleteAnnotation', this.onDeleteAnnotation);
  }

  onCreateAnnotation(annotation) {
    console.log('created', annotation);
  }

  onUpdateAnnotation(annotation, previous) {
    console.log('updated', annotation);
  }

  onDeleteAnnotation(annotation) {
    console.log('deleted', annotation);
  }

}

export default (anno, config) => new LegacyStoragePlugin(anno, config);