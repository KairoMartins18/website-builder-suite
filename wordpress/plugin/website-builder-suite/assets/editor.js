/**
 * Blocos do Website Builder Suite no editor do WordPress.
 * Sem etapa de build: usa os pacotes globais do WordPress (wp.*).
 */
( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var ServerSideRender = wp.serverSideRender;
	var blockEditor = wp.blockEditor;
	var components = wp.components;

	function Preview( props ) {
		return el(
			'div',
			blockEditor.useBlockProps(),
			el( ServerSideRender, { block: props.name, attributes: props.attributes } )
		);
	}

	function Sidebar( title, children ) {
		return el( blockEditor.InspectorControls, null, el( components.PanelBody, { title: title }, children ) );
	}

	wp.blocks.registerBlockType( 'wbs/free-section', {
		edit: function ( props ) {
			return el(
				wp.element.Fragment,
				null,
				Sidebar(
					__( 'Seção livre', 'website-builder-suite' ),
					el( 'p', null, __( 'Esta seção usa posicionamento livre. Edite o layout no aplicativo Website Builder Suite e exporte o tema novamente.', 'website-builder-suite' ) )
				),
				el( Preview, props )
			);
		},
		save: function () {
			return null;
		},
	} );

	wp.blocks.registerBlockType( 'wbs/form', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = props.setAttributes;
			return el(
				wp.element.Fragment,
				null,
				Sidebar( __( 'Formulário', 'website-builder-suite' ), [
					el( components.TextControl, {
						key: 'email',
						label: __( 'Enviar mensagens para (e-mail)', 'website-builder-suite' ),
						help: __( 'Vazio = e-mail do administrador do site.', 'website-builder-suite' ),
						type: 'email',
						value: a.email,
						onChange: function ( v ) {
							set( { email: v } );
						},
					} ),
					el( components.TextControl, {
						key: 'label',
						label: __( 'Texto do botão', 'website-builder-suite' ),
						value: a.submitLabel,
						onChange: function ( v ) {
							set( { submitLabel: v } );
						},
					} ),
				] ),
				el( Preview, props )
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp );
