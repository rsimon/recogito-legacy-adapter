import axios from 'axios';

class LegacyStoragePlugin {

  constructor(anno, config) {
    this.config = config;

    anno.on('createAnnotation', this.onCreateAnnotation);
    anno.on('updateAnnotation', this.onUpdateAnnotation);
    anno.on('deleteAnnotation', this.onDeleteAnnotation);
  }

  /** 
   * Legacy Recogito has a W3C WebAnno-like, but proprietary, annotation
   * format. This function performs the crosswalk to the legacy format 
   */
  toLegacyAnnotation = webanno => ({
    annotates: {
      document_id: this.config.documentId,
      filepart_id: this.config.filepartId,
      content_type: 'IMAGE_UPLOAD' // TODO
    },
    anchor: 'rect:x=10,y=10,w=200,h=200', // TODO 
    bodies: [
      { type: 'COMMENT', last_modified_by: 'rainer', value: 'Plugin Test!' }
    ]
  })

  /** Vice versa, this crosswalks from legacy to WebAnno **/
  fromLegacyAnnotation = legacy => {

  }

  onCreateAnnotation = annotation => {
    axios.post('/api/annotation', this.toLegacyAnnotation(annotation));
  }

  onUpdateAnnotation = (annotation, previous) => {
    console.log('updated', annotation);
  }

  onDeleteAnnotation = annotation => {
    console.log('deleted', annotation);
  }

}

export default (anno, config) => new LegacyStoragePlugin(anno, config);