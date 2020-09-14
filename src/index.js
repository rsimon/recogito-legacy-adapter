import axios from 'axios';

/**
 * TODO SUPPORT TEXT ANNOTATION!
 */
class LegacyStoragePlugin {

  constructor(anno, config) {
    this.config = config;

    anno.on('createAnnotation', this.onCreateAnnotation);
    anno.on('updateAnnotation', this.onUpdateAnnotation);
    anno.on('deleteAnnotation', this.onDeleteAnnotation);

    // Fetch annotations
    const url = `/api/document/${this.config.documentId}/part/${this.config.partSequenceNumber}/annotations`;

    axios.get(url).then(response => {
      const annotations = response.data.map(this.fromLegacyAnnotation);
      anno.setAnnotations(annotations);
    });
  }

  /** 
   * Legacy Recogito has a W3C WebAnno-like, but proprietary, annotation
   * format. This function performs the crosswalk to the legacy format 
   */
  toLegacyAnnotation = (webanno, keepId) => {
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
        last_modified_by: body.creator.id, 
        value: body.value 
      };
    }

    const legacy = {
      annotates: {
        document_id: this.config.documentId,
        filepart_id: this.config.filepartId,
        content_type: this.config.contentType
      },
      anchor: `rect:x=${x},y=${y},w=${w},h=${h}`, 
      bodies: webanno.body.map(toLegacyBody)
    };

    // If this is an UPDATE, we need to keep the ID.
    // If it's a CREATE, we need to remove it - this is how
    // legacy Recogito tells these two operations apart.
    if (keepId)
      legacy.annotation_id = webanno.id;

    return legacy;
  }

  /** Vice versa, this crosswalks from legacy to WebAnno **/
  fromLegacyAnnotation = legacy => {
    // Reminder: proprietary Recogito syntax is rect:x=292,y=69,w=137,h=125
    if (!legacy.anchor.startsWith('rect:x='))
      throw new Error('Recogito legacy storage supports rectangles only');
    
    const [ _, tuples ] = legacy.anchor.split(':');
    const [ x, y, w, h ] = tuples.split(',').map(t => parseFloat(t.split('=')[1]))

    const toWebAnnoBody = body => {
      let purpose = null;
      
      if (body.type === 'TAG')
        purpose = 'tagging';
      else if (body.type === 'COMMENT')
        purpose = 'commenting';
      else
        throw new Error(`Body type ${body.type} not supported`); 

      return {
        type: 'TextualBody',
        purpose,
        value: body.value,
        creator: {
          id: body.last_modified_by
        },
        created: body.last_modified_at
      };
    };

    return { 
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      id: legacy.annotation_id,
      type: 'Annotation',
      body: legacy.bodies.map(toWebAnnoBody),
      target: {
        selector: {
          type: 'FragmentSelector',
          conformsTo: 'http://www.w3.org/TR/media-frags/',
          value: `xywh=pixel:${x},${y},${w},${h}`
        }
      }
    }
  }

  onCreateAnnotation = (annotation, overrideId) => {
    axios.post('/api/annotation', this.toLegacyAnnotation(annotation)).then(response => {
      const { annotation_id } = response.data;
      overrideId(annotation_id);
    });
  }

  /** 
   * Note that legacy Recogito only has a single 'upsert' operation.
   * Therefore, updating works exactly like create. The only difference
   * is that we don't need ot update the ID.
   */
  onUpdateAnnotation = annotation => {
    axios.post('/api/annotation', this.toLegacyAnnotation(annotation, true));
  }

  onDeleteAnnotation = annotation => {
    axios.delete(`/api/annotation/${annotation.id}`);
  }

}

export default (anno, config) => new LegacyStoragePlugin(anno, config);