import { set } from 'lodash';
import vfjsComponentWrapper from '../../../vfjs-component-wrapper';

const vfjsHelpers = {
  vfjsHelperCreateField(vfjsFieldUiSchema) {
    const {
      id: vfjsFieldId,
      required: vfjsFieldRequired,
      children = [],
      component,
      model: vfjsFieldModelKey = '',
      fieldOptions: vfjsFieldOptions = {},
    } = vfjsFieldUiSchema;

    const isArray = this.vfjsHelperFieldIsArray(vfjsFieldModelKey);

    const fieldChildren = isArray
      ? children.reduce((flattenedChildren, child) => ([
        ...flattenedChildren,
        ...child.map(this.vfjsHelperCreateField),
      ]), [])
      : children.map(this.vfjsHelperCreateField);

    const vfjsFieldSchema = this.getVfjsFieldSchema(vfjsFieldModelKey) || {};
    const vfjsFieldSchemas = this.schemas;
    const vfjsFieldState = this.getVfjsFieldState(vfjsFieldModelKey) || {};
    const vfjsFieldModel = this.getVfjsFieldModel(vfjsFieldModelKey);
    const vfjsState = this.getVfjsState();
    const vfjsModel = this.getVfjsModel();

    const props = {
      ...vfjsFieldOptions,
      children,
      id: vfjsFieldId,
      model: vfjsFieldModel,
      modelKey: vfjsFieldModelKey,
      required: vfjsFieldRequired,
      schema: vfjsFieldSchema,
      schemas: vfjsFieldSchemas,
      state: vfjsFieldState,
      uiSchema: vfjsFieldUiSchema,
      value: vfjsFieldModel,
      vfjsBus: this.vfjsBus,
      vfjsFieldId,
      vfjsFieldModel,
      vfjsFieldModelKey,
      vfjsFieldOptions,
      vfjsFieldRequired,
      vfjsFieldSchema,
      vfjsFieldSchemas,
      vfjsFieldState,
      vfjsFieldUiSchema,
      vfjsModel,
      vfjsState,
    };

    return this.vfjsHelperCreateComponent({
      id: vfjsFieldId,
      component,
      children: fieldChildren,
      props,
    });
  },
  vfjsHelperHashString(string, binary = 62) {
    let integer = 0;

    for (let i = 0; i < string.length; i++) {
      const char = string.charCodeAt(i);
      integer = (integer * 33) ^ char; // eslint-disable-line no-bitwise
    }

    // Convert int to unsigned to return a positive number
    integer >>>= 0; // eslint-disable-line no-bitwise

    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const array = [];

    // Create an alphanumeric hash of unsigned int
    while (integer >= binary) {
      const char = integer % binary;
      array.push(chars[char]);
      integer = Math.floor(integer / binary);
    }

    return array.join('');
  },
  vfjsHelperCreateComponent({
    id,
    component,
    children,
    props,
  }) {
    // If the component is a local component
    // we don't want an additional wrapper around that
    // FIXME: If the component is globally registered we will unnecessarily wrap it!
    const noWrapper = (
      (typeof component === 'string' && component in this.vfjsComponents)
    );

    // Create the component VNODE directly if noWrapper is true
    //
    // Otherwise wrap the component inside a component which
    // has access to the vfjsComponentMixin
    const vfjsComponent = (noWrapper)
      ? this.$createElement(component, {
        props,
      }, children)
      : this.$createElement(vfjsComponentWrapper, {
        key: id,
        props: {
          ...props,
          component,
        },
      }, children);

    return vfjsComponent;
  },
  vfjsHelperApplyFieldModel(key, value) {
    const newVfjsModel = Object.assign({}, this.getVfjsModel());
    set(newVfjsModel, key, value);
    return newVfjsModel;
  },
  // The level param helps us to differentiate further between fields.
  // As the same field configuration may be present throughout the ui schema
  // and thus have the same hash.
  //
  // We mediate this by providing the depth level as a second param
  // which will make the hash unique for every field
  vfjsHelperGenerateField(field, level = 0) {
    if (!field) {
      return false;
    }

    const { children = [], ...fieldWithoutChildren } = field;
    const objString = JSON.stringify({ fieldWithoutChildren, level });
    const id = this.vfjsHelperHashString(objString);

    return {
      ...field,
      id,
      children: children.map((child, i) =>
        this.vfjsHelperGenerateField(child, (i + 1) * (level + 1))),
    };
  },
  vfjsHelperChildArrayMapper({ model, children = [], ...child }, parentModel, index) {
    return {
      ...child,
      model: this.vfjsHelperGetChildArrayModelAtIndex(model, parentModel, index),
      children: this.vfjsHelperChildArrayReducerMapper(parentModel, children, index),
    };
  },
  vfjsHelperChildArrayReducerMapper(model, children = [], index) {
    return children.reduce((allChildren, child) => ([
      ...allChildren,
      this.vfjsHelperChildArrayMapper(child, model, index),
    ]), []);
  },
  vfjsHelperGetChildArrayModelAtIndex(model, parentModel, index) {
    const relativeModel = this.vfjsHelperGetRelativeModel(model, parentModel);
    return relativeModel ? `${parentModel}.${index}.${relativeModel}` : model;
  },
  vfjsHelperGetRelativeModel(model, parentModel) {
    return model ? String(model).substr(parentModel.length + 1) : model;
  },
  vfjsHelperGetParentModel(model) {
    const parentIndex = String(model).lastIndexOf('.');
    return String(model).substr(0, parentIndex);
  },
  vfjsHelperFieldIsRequired(model) {
    if (model) {
      const parentModel = this.vfjsHelperGetParentModel(model);
      if (parentModel) {
        return this.vfjsFieldsRequired.indexOf(parentModel) !== -1;
      }

      return this.vfjsFieldsRequired.indexOf(model) !== -1;
    }

    return false;
  },
  vfjsHelperFieldIsArray(key) {
    if (!key) {
      return false;
    }

    const schema = this.getVfjsFieldSchema(key);
    return schema ? Array.isArray(schema.items) : false;
  },
};

export default vfjsHelpers;
