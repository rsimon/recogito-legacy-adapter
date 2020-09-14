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
  toLegacyAnnotation = webanno => {
    const fragment = webanno.target.selector.value;

    if (!fragment.startsWith('xywh=pixel:'))
      throw new Error('Recogito legacy storage supports rectangles only');

    // Convert media fragment syntax (xywh=pixel:292,69,137,125) to 
    // proprietary Recogito syntax (rect:x=292,y=69,w=137,h=125)
    const [ _, coords ] = fragment.split(':');
    const [ x, y, w, h] = coords.split(',').map(parseFloat);

    const toLegacyBody = body => {
      const type = body.type === 'TextualBody' ? 
        body.purpose === 'tagging' ? 'TAG' : 'COMMENT' :
        null;

      if (type === null) 
        throw new Error(`Unsupported body type: ${body.type}`);

      return { 
        type, 
        last_modified_by: this.config.currentUser, 
        value: body.value 
      };
    }

    return {
      annotates: {
        document_id: this.config.documentId,
        filepart_id: this.config.filepartId,
        content_type: this.config.contentType
      },
      anchor: `rect:x=${x},y=${y},w=${w},h=${h}`, 
      bodies: webanno.body.map(toLegacyBody)
    };
  }

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